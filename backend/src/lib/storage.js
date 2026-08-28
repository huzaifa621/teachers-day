const crypto = require('crypto');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.AWS_REGION || !process.env.S3_BUCKET) {
      throw new Error('AWS_REGION / S3_BUCKET are not set');
    }
    // Credentials come from the default provider chain — an EC2 instance role
    // in production, or ~/.aws/credentials / AWS_ACCESS_KEY_ID+SECRET env vars
    // for local dev. No keys are read from our own .env on purpose.
    client = new S3Client({
      region: process.env.AWS_REGION,
      // Without this the SDK bakes a CRC32 checksum of an *empty* body into
      // presigned PUT URLs, and S3 then rejects the browser's real upload with
      // XAmzContentChecksumMismatch. "WHEN_REQUIRED" keeps checksums for the
      // operations that actually mandate them.
      requestChecksumCalculation: 'WHEN_REQUIRED'
    });
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

// --- Direct browser -> S3 uploads -------------------------------------------
// Large videos used to stream through the API (multer memory storage), which
// meant the whole file sat in the app server's RAM and consumed its inbound
// bandwidth before ever reaching S3. Instead the browser now PUTs straight to
// S3 with a short-lived presigned URL, and only tells us the resulting key.
//
// Because the client chooses what key to send back, the key alone can't be
// trusted — a caller could name any object in the bucket. So each presign is
// returned with an HMAC over the key; the upload isn't accepted unless that
// token verifies, which proves *this* server issued the key.
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

function keyToken(key) {
  const secret = process.env.SESSION_SECRET || 'teachers-day-postcard-portal-dev-secret-change-me';
  return crypto.createHmac('sha256', secret).update(`upload:${key}`).digest('hex');
}

// Constant-time compare so the token can't be guessed a byte at a time.
function verifyKeyToken(key, token) {
  if (!key || !token) return false;
  const expected = Buffer.from(keyToken(key));
  const given = Buffer.from(String(token));
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

// content-type is added to signableHeaders so it's covered by the signature —
// by default S3 presigns sign only `host`, which would let the browser PUT
// under any content type it liked. With it signed, the PUT must carry exactly
// the type the server approved or S3 refuses the request outright.
async function presignUpload(dir, { originalName, contentType }) {
  const key = newKey(dir, originalName);
  const url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(['content-type']) }
  );
  return { key, url, token: keyToken(key), expiresIn: UPLOAD_URL_TTL_SECONDS };
}

// Confirms the browser's PUT actually landed, and that what landed matches
// what we authorised — the client reporting "done" is not evidence on its own.
async function headObject(key) {
  try {
    const out = await getClient().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
    return { size: out.ContentLength, contentType: out.ContentType };
  } catch (_) {
    return null;
  }
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

module.exports = {
  uploadBuffer,
  uploadBufferAt,
  presignUpload,
  verifyKeyToken,
  headObject,
  publicUrl,
  downloadBuffer,
  remove,
  BUCKET
};
