const crypto = require('crypto');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.AWS_REGION || !process.env.S3_BUCKET) {
      throw new Error('AWS_REGION / S3_BUCKET are not set');
    }
    // Credentials come from the default provider chain — an EC2 instance role
    // in production, or ~/.aws/credentials / AWS_ACCESS_KEY_ID+SECRET env vars
    // for local dev. No keys are read from our own .env on purpose.
    client = new S3Client({ region: process.env.AWS_REGION });
  }
  return client;
}

const BUCKET = () => process.env.S3_BUCKET;

function newKey(dir, originalName) {
  const ext = path.extname(originalName || '') || '';
  return `${dir}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
}

// Uploads a buffer to S3 and returns the storage key (path within the bucket).
async function uploadBuffer(dir, buffer, { originalName, contentType } = {}) {
  const key = newKey(dir, originalName);
  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  }));
  return key;
}

// Uploads to an exact, caller-chosen key (overwriting if present) — used for
// deterministic cache entries like generated postcard GIFs.
async function uploadBufferAt(key, buffer, { contentType } = {}) {
  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  }));
  return key;
}

// Bucket is expected to be public via bucket policy (not per-object ACLs —
// S3's modern default disables ACLs on new buckets). API access is gated,
// raw file access never was, matching the old app's behavior.
function publicUrl(key) {
  if (!key) return null;
  return `https://${BUCKET()}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function downloadBuffer(key) {
  const { Body } = await getClient().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  const bytes = await Body.transformToByteArray();
  return Buffer.from(bytes);
}

async function remove(key) {
  if (!key) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

module.exports = { uploadBuffer, uploadBufferAt, publicUrl, downloadBuffer, remove, BUCKET };
