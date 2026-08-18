const express = require('express');
const { professors, submissions, clearAll } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');

const router = express.Router();

async function exportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    professors: await professors.all(),
    submissions: await submissions.all()
  };
}

router.get('/export.json', requireAdmin, async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-day-export.json"');
  res.json(await exportPayload());
});

router.get('/backup.json', requireAdmin, async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-day-backup.json"');
  res.json(await exportPayload());
});

router.get('/export.csv', requireAdmin, async (req, res) => {
  const rows = await submissions.all();
  const header = ['id', 'studentName', 'studentInstitute', 'profName', 'profInstitute', 'type', 'message', 'fileName', 'createdAt'];
  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const s of rows) {
    lines.push([
      String(s._id), s.studentName, s.studentInstitute, s.profName, s.profInstitute,
      s.type, s.message, s.fileName, s.createdAt
    ].map(escapeCsv).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tributes-export.csv"');
  res.send(lines.join('\n'));
});

router.delete('/clear-all', requireAdmin, async (req, res) => {
  await clearAll();
  res.json({ ok: true });
});

module.exports = router;
