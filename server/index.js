const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');

const { UPLOADS_DIR, ROOT } = require('./lib/paths');

const authRoutes = require('./routes/auth');
const professorRoutes = require('./routes/professors');
const submissionRoutes = require('./routes/submissions');
const downloadRoutes = require('./routes/downloads');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4173;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/brand', express.static(path.join(ROOT, 'assets')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', downloadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// Multer / upload errors land here instead of crashing the process.
app.use((err, req, res, next) => {
  if (err) {
    console.error(err.message);
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Teachers' Day Postcard Portal running at http://localhost:${PORT}`);
  });

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

module.exports = app;
