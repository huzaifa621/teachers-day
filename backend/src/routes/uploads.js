const express = require('express');
const { requireStudent, requireAdmin } = require('../lib/middleware');
const storage = require('../lib/storage');

const router = express.Router();

// Kept in step with the old multer limits these presigns replaced, and with
// the client-side pre-checks in the upload forms.
const LIMITS = {
  video: { dir: 'videos', maxBytes: 200 * 1024 * 1024, pattern: /^video\// },
  photo: { dir: 'photos', maxBytes: 8 * 1024 * 1024, pattern: /^image\// }
};

// The size the browser declares is advisory — it lets us reject an oversized
// file before the upload rather than after. The binding check is the HEAD in
// resolveUpload(), which reads the size S3 actually stored.
function presignHandler(kind) {
  const { dir, maxBytes, pattern } = LIMITS[kind];
  return async (req, res) => {
    const contentType = (req.body.contentType || '').trim();
    const fileName = (req.body.fileName || '').trim();
    const size = Number(req.body.size);

    if (!pattern.test(contentType)) {
      return res.status(400).json({ error: kind === 'video' ? 'Only video files are accepted' : 'Photo must be an image' });
    }
    if (Number.isFinite(size) && size > maxBytes) {
      return res.status(400).json({ error: `File is too large (limit ${Math.round(maxBytes / (1024 * 1024))}MB)` });
    }

    try {
      const presigned = await storage.presignUpload(dir, { originalName: fileName, contentType });
      res.json(presigned);
    } catch (err) {
      console.error('presign failed', err);
      res.status(500).json({ error: 'Could not start the upload' });
    }
  };
}

// Shared by the submission and faculty routes: turns the {key, token} a
// client reports after its direct PUT into a trusted storage key, or throws.
// Three things have to hold — we issued the key, the object is really in the
// bucket, and what landed is the right type and size.
async function resolveUpload(kind, { key, token }) {
  const { dir, maxBytes, pattern } = LIMITS[kind];

  if (!storage.verifyKeyToken(key, token) || !String(key).startsWith(`${dir}/`)) {
    const err = new Error('Invalid upload reference');
    err.status = 400;
    throw err;
  }

  const head = await storage.headObject(key);
  if (!head) {
    const err = new Error('Upload did not complete — please try again');
    err.status = 400;
    throw err;
  }
  if (!pattern.test(head.contentType || '')) {
    storage.remove(key).catch(() => {});
    const err = new Error(kind === 'video' ? 'Uploaded file is not a video' : 'Uploaded file is not an image');
    err.status = 400;
    throw err;
  }
  if (head.size > maxBytes) {
    storage.remove(key).catch(() => {});
    const err = new Error(`File is too large (limit ${Math.round(maxBytes / (1024 * 1024))}MB)`);
    err.status = 400;
    throw err;
  }
  return key;
}

router.post('/video', requireStudent, presignHandler('video'));
router.post('/photo', requireAdmin, presignHandler('photo'));

module.exports = router;
module.exports.resolveUpload = resolveUpload;
