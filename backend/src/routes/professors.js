const express = require('express');
const multer = require('multer');
const { professors } = require('../lib/store');
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

module.exports = router;
