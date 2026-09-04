const express = require('express');
const { faculty, submissions } = require('../lib/store');
const storage = require('../lib/storage');

const router = express.Router();

// s.facultyPhotoPath is a snapshot taken when the tribute was submitted —
// if the faculty member's photo gets replaced later (e.g. swapping out a
// broken default photo), old submissions would otherwise keep pointing at
// the original, possibly-now-deleted S3 key forever. Always prefer the
// faculty's *current* photoPath; only fall back to the frozen snapshot if
// the faculty record itself is gone.
function toPublicSubmission(s, currentPhotoPath) {
  const photoPath = currentPhotoPath !== undefined ? currentPhotoPath : s.facultyPhotoPath;
  return {
    id: String(s._id),
    studentName: s.studentName,
    facultyName: s.facultyName,
    facultyInstitute: s.facultyInstitute,
    facultyPhoto: storage.publicUrl(photoPath),
    type: s.type,
    message: s.message,
    fileName: s.fileName,
    fileUrl: storage.publicUrl(s.filePath)
  };
}

// Unauthenticated by design — this is the link faculty get in email so they
// can scroll through their tributes without logging into the portal.
router.get('/tributes/:token', async (req, res) => {
  const member = await faculty.getByShareToken(req.params.token);
  if (!member) return res.status(404).json({ error: 'Not found' });

  const all = await submissions.byFaculty(String(member._id));
  const approved = all.filter((s) => s.status === 'approved');

  res.json({
    faculty: {
      name: member.name,
      institutes: member.institutes || [],
      photo: storage.publicUrl(member.photoPath)
    },
    submissions: approved.map((s) => toPublicSubmission(s, member.photoPath))
  });
});

// Unauthenticated by design — this is the per-tribute link a student can share.
// Only resolves while the submission is approved, so a link stops working the
// moment admin rejects (or un-approves) it, even if it worked before.
router.get('/submission/:id', async (req, res) => {
  const s = await submissions.get(req.params.id);
  if (!s || (s.status || 'pending') !== 'approved') return res.status(404).json({ error: 'Not found' });
  const member = await faculty.get(s.facultyId);
  res.json({ submission: toPublicSubmission(s, member ? member.photoPath : undefined) });
});

module.exports = router;
