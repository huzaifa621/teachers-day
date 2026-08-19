// One-off migration: copies every object from the Supabase Storage bucket
// to S3 at the *same key path* (photos/xxx.png, videos/xxx.mp4, etc).
// MongoDB only ever stores that key, never the full Supabase/S3 URL, so
// once objects exist at matching keys in S3 no DB migration is needed —
// existing professor/submission records just start resolving through
// storage.js's S3-backed publicUrl() automatically.
//
// Talks to Supabase over its plain REST API (no @supabase/supabase-js
// dependency needed — that package was removed from package.json when
// storage.js moved to S3) and reuses storage.js for the S3 side.
//
// Usage: from backend/, with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY +
// SUPABASE_BUCKET temporarily added to .env (alongside the existing
// AWS_REGION/S3_BUCKET vars storage.js already uses):
//   node scripts/migrate-supabase-to-s3.js

require('dotenv').config();
const storage = require('../src/lib/storage');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'teachers-day-uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env before running this (temporarily — remove them again once done).');
  process.exit(1);
}

const authHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: SUPABASE_SERVICE_ROLE_KEY
};

// Supabase's list API is per-directory (like `ls`, not recursive), and
// folders show up as entries with `id: null`. Walk it depth-first to find
// every actual file across every prefix (photos/, videos/, generated/, ...).
async function listAllFiles(prefix = '') {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  });
  if (!res.ok) throw new Error(`List failed for prefix "${prefix}": ${res.status} ${await res.text()}`);
  const entries = await res.json();

  const files = [];
  for (const entry of entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // it's a folder — recurse
      files.push(...await listAllFiles(fullPath));
    } else {
      files.push({ path: fullPath, contentType: entry.metadata?.mimetype });
    }
  }
  return files;
}

async function downloadFromSupabase(path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Download failed for "${path}": ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  console.log(`Listing objects in Supabase bucket "${SUPABASE_BUCKET}"...`);
  const files = await listAllFiles();
  console.log(`Found ${files.length} object(s). Copying to S3 bucket "${storage.BUCKET()}"...\n`);

  let ok = 0;
  let failed = 0;
  for (const [i, file] of files.entries()) {
    process.stdout.write(`[${i + 1}/${files.length}] ${file.path} ... `);
    try {
      const buffer = await downloadFromSupabase(file.path);
      await storage.uploadBufferAt(file.path, buffer, { contentType: file.contentType });
      console.log(`ok (${buffer.length} bytes)`);
      ok++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} copied, ${failed} failed out of ${files.length}.`);
  if (failed > 0) process.exitCode = 1;
})();
