const express = require('express');
const { professors, submissions } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  const profs = await professors.all();
  const subs = await submissions.all();
  const institutes = new Set(profs.map((p) => p.institute));
  const students = new Set(subs.map((s) => s.studentName));

  res.json({
    institutes: institutes.size,
    professors: profs.length,
    submissions: subs.length,
    students: students.size
  });
});

module.exports = router;
