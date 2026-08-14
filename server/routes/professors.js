const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { professors } = require('../lib/store');
const { requireAuth, requireAdmin } = require('../lib/middleware');
const { DIRS } = require('../lib/paths');

const router = express.Router();

const photoStorage = multer.diskStorage({
  destination: DIRS.photos,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `prof_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Photo must be an image'));
    cb(null, true);
  }
});

router.get('/', requireAuth, (req, res) => {
  const list = professors.all().map((p) => ({
    id: p.id,
    institute: p.institute,
    instituteCode: p.institute_code,
    name: p.name,
    dept: p.dept,
    email: p.email,
    photo: `/uploads/photos/${path.basename(p.photo_path)}`
  }));
  res.json(list);
});

router.post('/', requireAdmin, uploadPhoto.single('photo'), (req, res) => {
  const institute = (req.body.institute || '').trim();
  const instituteCode = (req.body.instituteCode || '').trim();
  const name = (req.body.name || '').trim();
  const dept = (req.body.dept || '').trim();
  const email = (req.body.email || '').trim();

  if (!institute || !name || !dept || !req.file) {
    return res.status(400).json({ error: 'Institute, name, department and photo are required' });
  }

  const prof = professors.create({
    institute,
    instituteCode,
    name,
    dept,
    email,
    photoPath: `photos/${req.file.filename}`
  });

  res.json({
    id: prof.id,
    institute: prof.institute,
    instituteCode: prof.institute_code,
    name: prof.name,
    dept: prof.dept,
    email: prof.email,
    photo: `/uploads/photos/${req.file.filename}`
  });
});

module.exports = router;
