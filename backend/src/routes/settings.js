const express = require('express');
const { settings } = require('../lib/store');
const { requireAdmin } = require('../lib/middleware');

const router = express.Router();

router.get('/linkedin-caption', requireAdmin, async (req, res) => {
  const caption = await settings.getLinkedInCaption();
  res.json({ caption });
});

router.put('/linkedin-caption', requireAdmin, async (req, res) => {
  const caption = (req.body.caption || '').trim();
  if (!caption) return res.status(400).json({ error: 'Caption cannot be empty' });
  if (caption.length > 1000) return res.status(400).json({ error: 'Caption is too long (max 1000 characters)' });
  await settings.setLinkedInCaption(caption);
  res.json({ caption });
});

module.exports = router;
