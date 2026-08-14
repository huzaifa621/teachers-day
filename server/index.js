const express = require('express');
const session = require('cookie-session');
const path = require('path');

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

// Session data lives signed inside the cookie itself (not a server-side store),
// since Vercel's serverless functions don't share memory across instances —
// a server-side session store would make logins randomly "disappear" whenever
// a request lands on a different instance than the one that created it.
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'teachers-day-postcard-portal-dev-secret-change-me'],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
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
