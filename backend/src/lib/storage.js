const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return client;
}

const BUCKET = () => process.env.SUPABASE_BUCKET || 'teachers-day-uploads';

function newKey(dir, originalName) {
  const ext = path.extname(originalName || '') || '';
  return `${dir}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
}

// Uploads a buffer to Supabase Storage and returns the storage key (path within the bucket).
async function uploadBuffer(dir, buffer, { originalName, contentType } = {}) {
  const key = newKey(dir, originalName);
  const { error } = await getClient()
    .storage.from(BUCKET())
    .upload(key, buffer, { contentType: contentType || 'application/octet-stream', upsert: false });
  if (error) throw error;
  return key;
}

// Uploads to an exact, caller-chosen key (overwriting if present) — used for
// deterministic cache entries like generated video cards.
async function uploadBufferAt(key, buffer, { contentType } = {}) {
  const { error } = await getClient()
    .storage.from(BUCKET())
    .upload(key, buffer, { contentType: contentType || 'application/octet-stream', upsert: true });
  if (error) throw error;
  return key;
}

// Bucket is expected to be public (matches the old app's fully-open /uploads static
// serving — API access was gated, raw file access never was).
function publicUrl(key) {
  if (!key) return null;
  const { data } = getClient().storage.from(BUCKET()).getPublicUrl(key);
  return data.publicUrl;
}

async function downloadBuffer(key) {
  const { data, error } = await getClient().storage.from(BUCKET()).download(key);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function remove(key) {
  if (!key) return;
  await getClient().storage.from(BUCKET()).remove([key]);
}

module.exports = { uploadBuffer, uploadBufferAt, publicUrl, downloadBuffer, remove, BUCKET };
