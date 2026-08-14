const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
// Vercel's deployment filesystem is read-only except /tmp, and /tmp doesn't
// persist across invocations. Writes go there in that environment instead of
// crashing outright; locally they still land in the real project folders.
const RUNTIME_ROOT = process.env.VERCEL ? os.tmpdir() : ROOT;
const UPLOADS_DIR = path.join(RUNTIME_ROOT, 'uploads');
const DIRS = {
  photos: path.join(UPLOADS_DIR, 'photos'),
  videos: path.join(UPLOADS_DIR, 'videos'),
  pdfs: path.join(UPLOADS_DIR, 'pdfs'),
  tmp: path.join(UPLOADS_DIR, 'tmp'),
  generated: path.join(UPLOADS_DIR, 'generated')
};

Object.values(DIRS).forEach((d) => fs.existsSync(d) || fs.mkdirSync(d, { recursive: true }));

const abs = (relPath) => path.join(UPLOADS_DIR, relPath);

module.exports = { ROOT, RUNTIME_ROOT, UPLOADS_DIR, DIRS, abs };
