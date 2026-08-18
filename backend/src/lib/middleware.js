function requireAuth(req, res, next) {
  if (!req.session.role) return res.status(401).json({ error: 'Not logged in' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function requireStudent(req, res, next) {
  if (req.session.role !== 'student') return res.status(403).json({ error: 'Student only' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireStudent };
