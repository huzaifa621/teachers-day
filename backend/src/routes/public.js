const express = require('express');
const { professors, submissions } = require('../lib/store');
const storage = require('../lib/storage');

const router = express.Router();

function toPublicSubmission(s) {
  return {
    id: String(s._id),
    studentName: s.studentName,
    profName: s.profName,
    profInstitute: s.profInstitute,
    profPhoto: storage.publicUrl(s.profPhotoPath),
    type: s.type,
    message: s.message,
    fileName: s.fileName,
    fileUrl: storage.publicUrl(s.filePath)
  };
}

// Unauthenticated by design — this is the link professors get in email so they
// can scroll through their tributes without logging into the portal.
router.get('/tributes/:token', async (req, res) => {
  const prof = await professors.getByShareToken(req.params.token);
  if (!prof) return res.status(404).json({ error: 'Not found' });

  const all = await submissions.byProfessor(String(prof._id));
  const approved = all.filter((s) => s.status === 'approved');

  res.json({
    professor: {
      name: prof.name,
      institute: prof.institute,
      designation: prof.designation,
      photo: storage.publicUrl(prof.photoPath)
    },
    submissions: approved.map(toPublicSubmission)
  });
});

module.exports = router;
