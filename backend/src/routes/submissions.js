const express = require('express');
const multer = require('multer');
const { professors, submissions } = require('../lib/store');
const { requireAuth, requireStudent, requireAdmin } = require('../lib/middleware');
const storage = require('../lib/storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^video\//.test(file.mimetype) || file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only video or PDF files are accepted'));
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
    type: s.type,
    message: s.message,
    fileName: s.fileName,
    fontFamily: s.fontFamily,
    textColor: s.textColor,
    fontSize: s.fontSize,
    createdAt: s.createdAt,
    fileUrl: s.filePath ? storage.publicUrl(s.filePath) : null
  };
}

router.get('/', requireAuth, async (req, res) => {
  res.json((await submissions.all()).map(toPublic));
});

router.get('/:id', requireAuth, async (req, res) => {
  const s = await submissions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(toPublic(s));
});

router.post('/', requireStudent, upload.single('file'), async (req, res) => {
  const type = req.body.type;
  const profId = req.body.profId;
  const message = (req.body.message || '').trim();
  const fontFamily = req.body.fontFamily || 'Georgia, serif';
  const textColor = req.body.textColor || '#2c1810';
  const fontSize = req.body.fontSize || '26px';

  if (!['text', 'video', 'pdf'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }
  const prof = await professors.get(profId);
  if (!prof) {
    return res.status(400).json({ error: 'Selected professor no longer exists' });
  }
  if (type === 'text' && !message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if ((type === 'video' || type === 'pdf') && !req.file) {
    return res.status(400).json({ error: `A ${type} file is required` });
  }
  if (type === 'video' && !/^video\//.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Uploaded file is not a video' });
  }
  if (type === 'pdf' && req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Uploaded file is not a PDF' });
  }

  try {
    let filePath = null;
    if (req.file) {
      const dir = type === 'video' ? 'videos' : 'pdfs';
      filePath = await storage.uploadBuffer(dir, req.file.buffer, {
        originalName: req.file.originalname,
        contentType: req.file.mimetype
      });
    }

    const sub = await submissions.create({
      studentName: req.session.studentName,
      studentInstitute: req.session.studentInstitute,
      prof,
      type,
      message: type === 'text' ? message : null,
      filePath,
      fileName: req.file ? req.file.originalname : null,
      fontFamily,
      textColor,
      fontSize
    });

    res.json(toPublic(sub));
  } catch (err) {
    console.error('submission create failed', err);
    res.status(500).json({ error: 'Could not save submission' });
  }
});

router.delete('/', requireAdmin, async (req, res) => {
  await submissions.deleteAll();
  res.json({ ok: true });
});

module.exports = router;
