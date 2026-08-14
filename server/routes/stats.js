const express = require('express');
const fs = require('fs');
const path = require('path');
const { professors, submissions } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');
const { UPLOADS_DIR } = require('../lib/paths');

const router = express.Router();

function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

router.get('/', requireAdmin, (req, res) => {
  const profs = professors.all();
  const subs = submissions.all();
  const institutes = new Set(profs.map((p) => p.institute));
  const students = new Set(subs.map((s) => s.student_name));
  const storageBytes = dirSize(UPLOADS_DIR);

  res.json({
    institutes: institutes.size,
    professors: profs.length,
    submissions: subs.length,
    students: students.size,
    storageMB: Math.round((storageBytes / (1024 * 1024)) * 100) / 100
  });
});

module.exports = router;
