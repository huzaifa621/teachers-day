const express = require('express');
const { submissions, professors } = require('../lib/store');
const { generateDownload, generateProfessorBundlePdf } = require('../lib/downloads');
const { requireAuth, requireAdmin } = require('../lib/middleware');

const router = express.Router();

function slug(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'postcard';
}

// One download per submission: PNG for text tributes, a short looping GIF
// (postcard frame + video composited together) for video tributes.
router.get('/submissions/:id/download', requireAuth, async (req, res) => {
  const sub = await submissions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const prof = await professors.get(sub.profId);
  if (!prof) return res.status(404).json({ error: 'Professor no longer exists' });

  try {
    const { buffer, mime, ext } = await generateDownload(sub, prof);
    const filename = `postcard-${slug(sub.studentName)}-to-${slug(sub.profName)}.${ext}`;
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('download generation failed', err);
    res.status(500).json({ error: 'Could not generate download' });
  }
});

router.get('/professors/:id/download/pdf', requireAdmin, async (req, res) => {
  const prof = await professors.get(req.params.id);
  if (!prof) return res.status(404).json({ error: 'Not found' });
  const textSubs = (await submissions.byProfessor(prof._id))
    .filter((s) => s.type === 'text' && (s.status || 'pending') === 'approved');
  if (textSubs.length === 0) {
    return res.status(404).json({ error: 'No approved text tributes for this professor yet' });
  }
  try {
    const buffer = await generateProfessorBundlePdf(prof, textSubs);
    const filename = `tributes-for-${slug(prof.name)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('bundle pdf generation failed', err);
    res.status(500).json({ error: 'Could not generate bundled PDF' });
  }
});

module.exports = router;
