const express = require('express');
const { INSTITUTES } = require('../lib/institutes');

const router = express.Router();

// Public (no auth) — needed by the student/admin login screens before a session exists.
router.get('/', (req, res) => {
  res.json(INSTITUTES);
});

module.exports = router;
