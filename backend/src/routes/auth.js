const express = require('express');
const { INSTITUTES } = require('../lib/institutes');
const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

router.post('/student', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const institute = (req.body.institute || '').trim();
  if (!name || !email || !institute) {
    return res.status(400).json({ error: 'Name, email and institute are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' });
  }
  if (!INSTITUTES.includes(institute)) {
    return res.status(400).json({ error: 'Please select a valid institute' });
  }
  req.session.role = 'student';
  req.session.studentName = name;
  req.session.studentEmail = email;
  req.session.studentInstitute = institute;
  res.json({ ok: true, role: 'student', name, email, institute });
});

router.post('/admin', (req, res) => {
  const password = req.body.password || '';
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  req.session.role = 'admin';
  res.json({ ok: true, role: 'admin' });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.role) return res.json({ role: null });
  res.json({
    role: req.session.role,
    name: req.session.studentName || null,
    email: req.session.studentEmail || null,
    institute: req.session.studentInstitute || null
  });
});

module.exports = router;
