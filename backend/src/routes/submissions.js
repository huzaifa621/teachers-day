const express = require('express');
const { professors, submissions } = require('../lib/store');
const { requireAuth, requireStudent, requireAdmin } = require('../lib/middleware');
const storage = require('../lib/storage');
const { resolveUpload } = require('./uploads');
const { FONT_FAMILY, TEXT_COLOR, FONT_SIZE } = require('../lib/postcard-style');

const STATUSES = ['pending', 'approved', 'rejected'];

const router = express.Router();

// includeInternal (admin-only) adds the silent submitter signals — never
// sent to students, even for their own submissions.
function toPublic(s, includeInternal) {
  const out = {
    id: String(s._id),
    studentName: s.studentName,
    studentInstitute: s.studentInstitute,
    profId: s.profId,
    profName: s.profName,
    profInstitute: s.profInstitute,
    profPhoto: storage.publicUrl(s.profPhotoPath),
    type: s.type,
    message: s.message,
    fileName: s.fileName,
    fontFamily: s.fontFamily,
    textColor: s.textColor,
    fontSize: s.fontSize,
    status: s.status || 'pending',
    createdAt: s.createdAt,
    fileUrl: storage.publicUrl(s.filePath)
  };
  if (includeInternal) {
    out.deviceId = s.deviceId || null;
    out.ip = s.ip || null;
  }
  return out;
}

router.get('/', requireAuth, async (req, res) => {
  const all = await submissions.all();
  const isAdmin = req.session.role === 'admin';

  // A student's own "My Tributes" gallery passes back the ids it remembered
  // (see lib/mySubmissions.js — there's no real student account to scope by,
  // so the browser tracks its own submission ids). Those get returned
  // regardless of moderation status, since a student should be able to see
  // their own pending/rejected tributes — but only the exact ids they hold,
  // not the general moderation queue.
  if (req.query.ids !== undefined) {
    const idSet = new Set(String(req.query.ids).split(',').filter(Boolean));
    const mine = all.filter((s) => idSet.has(String(s._id)));
    return res.json(mine.map((s) => toPublic(s, isAdmin)));
  }

  // Otherwise, moderation status is admin-only — everyone else only sees approved tributes.
  const visible = isAdmin ? all : all.filter((s) => (s.status || 'pending') === 'approved');
  res.json(visible.map((s) => toPublic(s, isAdmin)));
});

router.get('/:id', requireAuth, async (req, res) => {
  const s = await submissions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const isAdmin = req.session.role === 'admin';
  if (!isAdmin && (s.status || 'pending') !== 'approved') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(toPublic(s, isAdmin));
});

// Video tributes no longer arrive as multipart here — the browser PUTs the
// file straight to S3 with a presigned URL (see routes/uploads.js) and this
// request carries only the resulting {fileKey, fileToken}. So the request body
// is small JSON whatever the video's size.
router.post('/', requireStudent, async (req, res) => {
  const profId = req.body.profId;
  const message = (req.body.message || '').trim();
  const fileKey = (req.body.fileKey || '').trim();
  const hasVideo = !!fileKey;

  if (!message && !hasVideo) {
    return res.status(400).json({ error: 'Write a message or upload a video' });
  }
  if (message && hasVideo) {
    return res.status(400).json({ error: 'Choose either a message or a video, not both' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message is too long' });
  }
  const prof = await professors.get(profId);
  if (!prof) {
    return res.status(400).json({ error: 'Selected professor no longer exists' });
  }

  const type = hasVideo ? 'video' : 'text';

  try {
    let filePath = null;
    if (hasVideo) {
      filePath = await resolveUpload('video', { key: fileKey, token: req.body.fileToken });
    }

    const sub = await submissions.create({
      studentName: req.session.studentName,
      studentInstitute: req.session.studentInstitute,
      prof,
      type,
      message: message || null,
      filePath,
      fileName: hasVideo ? (req.body.fileName || '').trim().slice(0, 255) || null : null,
      fontFamily: FONT_FAMILY,
      textColor: TEXT_COLOR,
      fontSize: FONT_SIZE,
      deviceId: (req.body.deviceId || '').trim().slice(0, 100) || null,
      ip: req.ip || null
    });

    res.json(toPublic(sub, false));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('submission create failed', err);
    res.status(500).json({ error: 'Could not save submission' });
  }
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const s = await submissions.setStatus(req.params.id, status);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(toPublic(s, true));
});

module.exports = router;
