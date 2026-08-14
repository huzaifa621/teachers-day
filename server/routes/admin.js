const express = require('express');
const { professors, submissions, clearAll } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');

const router = express.Router();

function exportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    professors: professors.all(),
    submissions: submissions.all()
  };
}

router.get('/export.json', requireAdmin, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-day-export.json"');
  res.json(exportPayload());
});

router.get('/backup.json', requireAdmin, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-day-backup.json"');
  res.json(exportPayload());
});

router.get('/export.csv', requireAdmin, (req, res) => {
  const rows = submissions.all();
  const header = ['id', 'studentName', 'studentInstitute', 'profName', 'profInstitute', 'type', 'message', 'fileName', 'createdAt'];
  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const s of rows) {
    lines.push([
      s.id, s.student_name, s.student_institute, s.prof_name, s.prof_institute,
      s.type, s.message, s.file_name, s.created_at
    ].map(escapeCsv).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tributes-export.csv"');
  res.send(lines.join('\n'));
});

router.delete('/clear-all', requireAdmin, (req, res) => {
  clearAll();
  res.json({ ok: true });
});

module.exports = router;
