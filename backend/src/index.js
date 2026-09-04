require('dotenv').config();

const express = require('express');
const session = require('cookie-session');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const submissionRoutes = require('./routes/submissions');
const uploadRoutes = require('./routes/uploads');
const downloadRoutes = require('./routes/downloads');
const statsRoutes = require('./routes/stats');
const institutesRoutes = require('./routes/institutes');
const publicRoutes = require('./routes/public');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 4173;
const isProd = process.env.NODE_ENV === 'production';

// Railway (like Heroku/Render) terminates HTTPS at its edge and forwards plain HTTP
// to the app, so Express sees every request as insecure by default. Without this,
// the `secure: true` cookie below gets silently dropped instead of ever being set —
// cookie-session's underlying `cookies` lib refuses to set a Secure cookie on what
// it thinks is a plain HTTP connection.
app.set('trust proxy', 1);

// The frontend now lives on a different origin (separate Next.js deployment),
// so the API needs explicit CORS + a cross-site-capable session cookie instead
// of relying on same-origin defaults.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'teachers-day-postcard-portal-dev-secret-change-me'],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  // Cross-site cookies require SameSite=None + Secure, which in turn requires HTTPS —
  // fine in production, but relaxed for local http://localhost development.
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd
}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', downloadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/institutes', institutesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);

// Upload / validation errors land here instead of crashing the process.
app.use((err, req, res, next) => {
  if (err) {
    console.error(err.message);
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Teachers' Day Postcard Portal API running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

module.exports = app;
