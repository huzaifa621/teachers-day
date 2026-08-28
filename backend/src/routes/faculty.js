const express = require('express');
const { faculty, submissions } = require('../lib/store');
const { requireAuth, requireAdmin } = require('../lib/middleware');
const { INSTITUTES } = require('../lib/institutes');
const storage = require('../lib/storage');
const { resolveUpload } = require('./uploads');

const router = express.Router();

function toPublic(m) {
  return {
    id: String(m._id),
    institutes: m.institutes || [],
    name: m.name,
    email: m.email,
    photo: storage.publicUrl(m.photoPath)
  };
}

// A faculty member can be affiliated with several institutes, so the forms
// submit an array. Every entry has to be a known institute, and duplicates are
// collapsed so the same institute can't be stored twice.
function parseInstitutes(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const cleaned = [...new Set(list.map((i) => String(i || '').trim()).filter(Boolean))];
  if (cleaned.length === 0) return { error: 'Select at least one institute' };
  const unknown = cleaned.find((i) => !INSTITUTES.includes(i));
  if (unknown) return { error: `Unknown institute: ${unknown}` };
  return { institutes: cleaned };
}

// Deliberately permissive — this only catches obvious typos. Email is the
// unique identifier, so the meaningful check is the duplicate lookup below.
function parseEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email) return { error: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address' };
  return { email };
}

router.get('/', requireAuth, async (req, res) => {
  // Students only ever see faculty affiliated with the institute they logged
  // in with; byInstitute matches against the institutes array.
  const list = req.session.role === 'student'
    ? await faculty.byInstitute(req.session.studentInstitute)
    : await faculty.all();
  res.json(list.map(toPublic));
});

// Photos are PUT straight to S3 by the browser — this request carries only the
// {photoKey, photoToken} that upload produced (see routes/uploads.js).
router.post('/', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const photoKey = (req.body.photoKey || '').trim();

  const parsedInstitutes = parseInstitutes(req.body.institutes);
  if (parsedInstitutes.error) return res.status(400).json({ error: parsedInstitutes.error });

  const parsedEmail = parseEmail(req.body.email);
  if (parsedEmail.error) return res.status(400).json({ error: parsedEmail.error });

  if (!name || !photoKey) {
    return res.status(400).json({ error: 'Institute, name, email and photo are required' });
  }

  // Checked up front for a clear message; the unique index in db.js is the
  // actual guarantee, and still catches a race between two concurrent adds.
  if (await faculty.byEmail(parsedEmail.email)) {
    return res.status(409).json({ error: 'A faculty member with this email already exists' });
  }

  try {
    const photoPath = await resolveUpload('photo', { key: photoKey, token: req.body.photoToken });

    const member = await faculty.create({
      institutes: parsedInstitutes.institutes,
      name,
      email: parsedEmail.email,
      photoPath
    });
    res.json(toPublic(member));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A faculty member with this email already exists' });
    }
    console.error('faculty create failed', err);
    res.status(500).json({ error: 'Could not save faculty member' });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const existing = await faculty.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const name = (req.body.name || '').trim();

  const parsedInstitutes = parseInstitutes(req.body.institutes);
  if (parsedInstitutes.error) return res.status(400).json({ error: parsedInstitutes.error });

  const parsedEmail = parseEmail(req.body.email);
  if (parsedEmail.error) return res.status(400).json({ error: parsedEmail.error });

  if (!name) {
    return res.status(400).json({ error: 'Institute, name and email are required' });
  }

  // Only a clash with a *different* record is a duplicate — keeping your own
  // email while editing the name has to stay allowed.
  const clash = await faculty.byEmail(parsedEmail.email);
  if (clash && String(clash._id) !== String(existing._id)) {
    return res.status(409).json({ error: 'Another faculty member already uses this email' });
  }

  try {
    const patch = {
      institutes: parsedInstitutes.institutes,
      name,
      email: parsedEmail.email
    };

    // Photo is optional on edit — only replaced when the admin picked a new one.
    const photoKey = (req.body.photoKey || '').trim();
    if (photoKey) {
      patch.photoPath = await resolveUpload('photo', { key: photoKey, token: req.body.photoToken });
    }

    const member = await faculty.update(req.params.id, patch);
    if (photoKey && existing.photoPath) storage.remove(existing.photoPath).catch(() => {});
    res.json(toPublic(member));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Another faculty member already uses this email' });
    }
    console.error('faculty update failed', err);
    res.status(500).json({ error: 'Could not update faculty member' });
  }
});

router.get('/:id/link', requireAdmin, async (req, res) => {
  const token = await faculty.ensureShareToken(req.params.id);
  if (!token) return res.status(404).json({ error: 'Not found' });
  res.json({ token });
});

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Bulk export of tribute links, one row per faculty member who has at least one
// approved tribute — the origin is passed by the frontend (window.location.origin)
// since the backend may be configured with more than one allowed frontend origin.
router.get('/links.csv', requireAdmin, async (req, res) => {
  const origin = (req.query.origin || '').replace(/\/+$/, '');
  const all = await faculty.all();

  const rows = [];
  for (const m of all) {
    const memberSubs = await submissions.byFaculty(String(m._id));
    const approvedCount = memberSubs.filter((s) => s.status === 'approved').length;
    if (approvedCount === 0) continue;
    const token = await faculty.ensureShareToken(String(m._id));
    // Several institutes collapse into one cell so the export stays one row
    // per faculty member.
    rows.push([m.name, (m.institutes || []).join('; '), m.email || '', approvedCount, `${origin}/p/${token}`]);
  }

  const header = ['Name', 'Institutes', 'Email', 'Approved Tributes', 'Link'];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="faculty-tribute-links.csv"');
  res.send(csv);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const member = await faculty.remove(req.params.id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  if (member.photoPath) storage.remove(member.photoPath).catch(() => {});
  res.json({ ok: true });
});

module.exports = router;
