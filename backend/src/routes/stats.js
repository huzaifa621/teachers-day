const express = require('express');
const { professors, submissions } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');
const storage = require('../lib/storage');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  const profs = await professors.all();
  const subs = await submissions.all();
  const institutes = new Set(profs.map((p) => p.institute));
  const students = new Set(subs.map((s) => s.studentName));
  const storageBytes = await storage.totalSizeBytes().catch(() => 0);

  res.json({
    institutes: institutes.size,
    professors: profs.length,
    submissions: subs.length,
    students: students.size,
    storageMB: Math.round((storageBytes / (1024 * 1024)) * 100) / 100
  });
});

module.exports = router;
