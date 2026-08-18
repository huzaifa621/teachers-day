const path = require('path');
const fs = require('fs');
const os = require('os');

// Scratch space only — the durable store is Supabase Storage (see storage.js).
// Everything written here is transient (ffmpeg intermediate files, poster frames)
// and safe to lose on restart.
const SCRATCH_DIR = path.join(os.tmpdir(), 'teachers-day-scratch');
fs.existsSync(SCRATCH_DIR) || fs.mkdirSync(SCRATCH_DIR, { recursive: true });

const abs = (name) => path.join(SCRATCH_DIR, name);

module.exports = { SCRATCH_DIR, abs };
