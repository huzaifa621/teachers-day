const express = require('express');
const { faculty, submissions } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  const members = await faculty.all();
  const subs = await submissions.all();
  // Faculty can span several institutes, so flatten before counting distinct ones.
  const institutes = new Set(members.flatMap((m) => m.institutes || []));
  const students = new Set(subs.map((s) => s.studentName));

  res.json({
    institutes: institutes.size,
    faculty: members.length,
    submissions: subs.length,
    students: students.size
  });
});

module.exports = router;
