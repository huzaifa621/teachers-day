const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { professors, submissions } = require('../lib/store');
const { requireAuth, requireStudent, requireAdmin } = require('../lib/middleware');
const { DIRS } = require('../lib/paths');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (/^video\//.test(file.mimetype)) return cb(null, DIRS.videos);
    if (file.mimetype === 'application/pdf') return cb(null, DIRS.pdfs);
    cb(new Error('Unsupported file type'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^video\//.test(file.mimetype) || file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only video or PDF files are accepted'));
  }
});

function toPublic(s) {
  return {
    id: s.id,
    studentName: s.student_name,
    studentInstitute: s.student_institute,
    profId: s.prof_id,
    profName: s.prof_name,
    profInstitute: s.prof_institute,
    type: s.type,
    message: s.message,
    fileName: s.file_name,
    fontFamily: s.font_family,
    textColor: s.text_color,
    createdAt: s.created_at,
    fileUrl: s.file_path ? `/uploads/${s.file_path}` : null
  };
}

router.get('/', requireAuth, (req, res) => {
  res.json(submissions.all().map(toPublic));
});

router.get('/:id', requireAuth, (req, res) => {
  const s = submissions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(toPublic(s));
});

router.post('/', requireStudent, upload.single('file'), (req, res) => {
  const type = req.body.type;
  const profId = req.body.profId;
  const message = (req.body.message || '').trim();
  const fontFamily = req.body.fontFamily || 'Georgia, serif';
  const textColor = req.body.textColor || '#2c1810';

  if (!['text', 'video', 'pdf'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }
  const prof = professors.get(profId);
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

  const subDir = type === 'video' ? 'videos' : 'pdfs';
  const filePath = req.file ? `${subDir}/${req.file.filename}` : null;

  const sub = submissions.create({
    studentName: req.session.studentName,
    studentInstitute: req.session.studentInstitute,
    prof,
    type,
    message: type === 'text' ? message : null,
    filePath,
    fileName: req.file ? req.file.originalname : null,
    fontFamily,
    textColor
  });

  res.json(toPublic(sub));
});

router.delete('/', requireAdmin, (req, res) => {
  submissions.deleteAll();
  res.json({ ok: true });
});

module.exports = router;
