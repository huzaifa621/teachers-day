const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { RUNTIME_ROOT } = require('./paths');

const DATA_DIR = path.join(RUNTIME_ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS professors (
    id TEXT PRIMARY KEY,
    institute TEXT NOT NULL,
    institute_code TEXT,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    email TEXT,
    photo_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_institute TEXT NOT NULL,
    prof_id TEXT NOT NULL,
    prof_name TEXT NOT NULL,
    prof_institute TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('text','video','pdf')),
    message TEXT,
    file_path TEXT,
    file_name TEXT,
    font_family TEXT DEFAULT 'Georgia, serif',
    text_color TEXT DEFAULT '#2c1810',
    created_at TEXT NOT NULL,
    FOREIGN KEY (prof_id) REFERENCES professors(id)
  );
`);

// Added after the initial release — guard with try/catch since
// CREATE TABLE IF NOT EXISTS above won't alter an already-existing table.
try {
  db.exec(`ALTER TABLE submissions ADD COLUMN font_size TEXT DEFAULT '26px'`);
} catch (_) { /* column already exists */ }

module.exports = db;
