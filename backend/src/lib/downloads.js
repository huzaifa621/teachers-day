const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPNG, renderPDF, mergePDFs } = require('./renderer');
const { renderPostcardHTML } = require('./postcard-template');
const { compositeVideoGif } = require('./video-compositor');
const { urlToDataUri } = require('./assets');
const { SCRATCH_DIR } = require('./paths');
const storage = require('./storage');

async function profPhotoDataUri(prof) {
  return urlToDataUri(storage.publicUrl(prof.photoPath));
}

function baseData(sub) {
  return {
    profName: sub.profName,
    studentName: sub.studentName,
    fontFamily: sub.fontFamily,
    textColor: sub.textColor,
    fontSize: sub.fontSize
  };
}

async function downloadToScratch(key) {
  const buffer = await storage.downloadBuffer(key);
  const scratchPath = path.join(SCRATCH_DIR, `src_${crypto.randomBytes(6).toString('hex')}${path.extname(key)}`);
  fs.writeFileSync(scratchPath, buffer);
  return scratchPath;
}

// Single download for a submission — exactly what the portal shows: a PNG
// snapshot of the postcard for text tributes, a short looping GIF (postcard
// frame + video composited together) for video tributes.
async function generateDownload(sub, prof) {
  if (sub.type === 'video') {
    // cached in Supabase since compositing is slow
    const cachedKey = `generated/${sub._id}_card.gif`;
    try {
      const buffer = await storage.downloadBuffer(cachedKey);
      return { buffer, mime: 'image/gif', ext: 'gif' };
    } catch (_) { /* not cached yet */ }

    const sourcePath = await downloadToScratch(sub.filePath);
    const outPath = path.join(SCRATCH_DIR, `out_${crypto.randomBytes(6).toString('hex')}.gif`);
    try {
      await compositeVideoGif({
        videoPath: sourcePath,
        ...baseData(sub),
        profPhotoDataUri: await profPhotoDataUri(prof),
        outPath
      });
      const buffer = fs.readFileSync(outPath);
      // Best-effort cache under a deterministic key; regenerate next time if this fails.
      await storage.uploadBufferAt(cachedKey, buffer, { contentType: 'image/gif' }).catch(() => {});
      return { buffer, mime: 'image/gif', ext: 'gif' };
    } finally {
      fs.unlinkSync(sourcePath);
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  }

  // text (and legacy 'pdf' submissions from the old app) render as a single PNG snapshot
  const html = renderPostcardHTML({
    ...baseData(sub),
    profPhotoDataUri: await profPhotoDataUri(prof),
    media: sub.type === 'pdf' ? { kind: 'pdf', fileName: sub.fileName } : { kind: 'text', message: sub.message }
  });
  const buffer = await renderPNG(html, { scale: 2 });
  return { buffer, mime: 'image/png', ext: 'png' };
}

async function generateProfessorBundlePdf(prof, textSubmissions) {
  const buffers = [];
  const photoDataUri = await profPhotoDataUri(prof);
  for (const sub of textSubmissions) {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: photoDataUri,
      media: { kind: 'text', message: sub.message }
    });
    buffers.push(await renderPDF(html));
  }
  return mergePDFs(buffers);
}

module.exports = { generateDownload, generateProfessorBundlePdf, profPhotoDataUri };
