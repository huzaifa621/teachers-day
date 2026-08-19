const express = require('express');
const multer = require('multer');
const { professors, submissions } = require('../lib/store');
const { requireAuth, requireAdmin } = require('../lib/middleware');
const { INSTITUTES } = require('../lib/institutes');
const storage = require('../lib/storage');

const router = express.Router();

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Photo must be an image'));
    cb(null, true);
  }
});

function toPublic(p) {
  return {
    id: String(p._id),
    institute: p.institute,
    name: p.name,
    designation: p.designation,
    email: p.email,
    photo: storage.publicUrl(p.photoPath)
  };
}

router.get('/', requireAuth, async (req, res) => {
  // Students only ever see professors from the institute they logged in with.
  const list = req.session.role === 'student'
    ? await professors.byInstitute(req.session.studentInstitute)
    : await professors.all();
  res.json(list.map(toPublic));
});

router.post('/', requireAdmin, uploadPhoto.single('photo'), async (req, res) => {
  const institute = (req.body.institute || '').trim();
  const name = (req.body.name || '').trim();
  const designation = (req.body.designation || '').trim();
  const email = (req.body.email || '').trim();

  if (!institute || !name || !designation || !req.file) {
    return res.status(400).json({ error: 'Institute, name, designation and photo are required' });
  }
  if (!INSTITUTES.includes(institute)) {
    return res.status(400).json({ error: 'Unknown institute' });
  }

  try {
    const photoPath = await storage.uploadBuffer('photos', req.file.buffer, {
      originalName: req.file.originalname,
      contentType: req.file.mimetype
    });

    const prof = await professors.create({ institute, name, designation, email, photoPath });
    res.json(toPublic(prof));
  } catch (err) {
    console.error('professor create failed', err);
    res.status(500).json({ error: 'Could not save professor' });
  }
});

router.patch('/:id', requireAdmin, uploadPhoto.single('photo'), async (req, res) => {
  const existing = await professors.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const institute = (req.body.institute || '').trim();
  const name = (req.body.name || '').trim();
  const designation = (req.body.designation || '').trim();
  const email = (req.body.email || '').trim();

  if (!institute || !name || !designation) {
    return res.status(400).json({ error: 'Institute, name and designation are required' });
  }
  if (!INSTITUTES.includes(institute)) {
    return res.status(400).json({ error: 'Unknown institute' });
  }

  try {
    const patch = { institute, name, designation, email: email || null };

    if (req.file) {
      patch.photoPath = await storage.uploadBuffer('photos', req.file.buffer, {
        originalName: req.file.originalname,
        contentType: req.file.mimetype
      });
    }

    const prof = await professors.update(req.params.id, patch);
    if (req.file && existing.photoPath) storage.remove(existing.photoPath).catch(() => {});
    res.json(toPublic(prof));
  } catch (err) {
    console.error('professor update failed', err);
    res.status(500).json({ error: 'Could not update professor' });
  }
});

router.get('/:id/link', requireAdmin, async (req, res) => {
  const token = await professors.ensureShareToken(req.params.id);
  if (!token) return res.status(404).json({ error: 'Not found' });
  res.json({ token });
});

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Bulk export of tribute links, one row per professor who has at least one
// approved tribute — the origin is passed by the frontend (window.location.origin)
// since the backend may be configured with more than one allowed frontend origin.
router.get('/links.csv', requireAdmin, async (req, res) => {
  const origin = (req.query.origin || '').replace(/\/+$/, '');
  const all = await professors.all();

  const rows = [];
  for (const p of all) {
    const profSubs = await submissions.byProfessor(String(p._id));
    const approvedCount = profSubs.filter((s) => s.status === 'approved').length;
    if (approvedCount === 0) continue;
    const token = await professors.ensureShareToken(String(p._id));
    rows.push([p.name, p.institute, p.designation, p.email || '', approvedCount, `${origin}/p/${token}`]);
  }

  const header = ['Name', 'Institute', 'Designation', 'Email', 'Approved Tributes', 'Link'];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="professor-tribute-links.csv"');
  res.send(csv);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const prof = await professors.remove(req.params.id);
  if (!prof) return res.status(404).json({ error: 'Not found' });
  if (prof.photoPath) storage.remove(prof.photoPath).catch(() => {});
  res.json({ ok: true });
});

module.exports = router;
