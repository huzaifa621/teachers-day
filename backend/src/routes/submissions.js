const express = require('express');
const multer = require('multer');
const { professors, submissions } = require('../lib/store');
const { requireAuth, requireStudent, requireAdmin } = require('../lib/middleware');
const storage = require('../lib/storage');
const { FONT_FAMILY, TEXT_COLOR, FONT_SIZE } = require('../lib/postcard-style');

const STATUSES = ['pending', 'approved', 'rejected'];

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^video\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only video files are accepted'));
  }
});

function toPublic(s) {
  return {
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
}

router.get('/', requireAuth, async (req, res) => {
  const all = await submissions.all();
  // Moderation status is admin-only — students only ever see approved tributes.
  const visible = req.session.role === 'admin' ? all : all.filter((s) => (s.status || 'pending') === 'approved');
  res.json(visible.map(toPublic));
});

router.get('/:id', requireAuth, async (req, res) => {
  const s = await submissions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (req.session.role !== 'admin' && (s.status || 'pending') !== 'approved') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(toPublic(s));
});

router.post('/', requireStudent, upload.single('file'), async (req, res) => {
  const profId = req.body.profId;
  const message = (req.body.message || '').trim();
  const hasVideo = !!req.file;

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
  if (hasVideo && !/^video\//.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Uploaded file is not a video' });
  }

  const type = hasVideo ? 'video' : 'text';

  try {
    let filePath = null;
    if (hasVideo) {
      filePath = await storage.uploadBuffer('videos', req.file.buffer, {
        originalName: req.file.originalname,
        contentType: req.file.mimetype
      });
    }

    const sub = await submissions.create({
      studentName: req.session.studentName,
      studentInstitute: req.session.studentInstitute,
      prof,
      type,
      message: message || null,
      filePath,
      fileName: req.file ? req.file.originalname : null,
      fontFamily: FONT_FAMILY,
      textColor: TEXT_COLOR,
      fontSize: FONT_SIZE
    });

    res.json(toPublic(sub));
  } catch (err) {
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
  res.json(toPublic(s));
});

module.exports = router;
