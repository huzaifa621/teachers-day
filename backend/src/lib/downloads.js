const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPNG, renderPDF, mergePDFs } = require('./renderer');
const { renderPostcardHTML } = require('./postcard-template');
const { compositeVideoCard, extractPosterFrame } = require('./video-compositor');
const { fileToDataUri, urlToDataUri } = require('./assets');
const { SCRATCH_DIR } = require('./paths');
const storage = require('./storage');

async function profPhotoDataUri(prof) {
  return urlToDataUri(storage.publicUrl(prof.photoPath));
}

function baseData(sub) {
  return {
    profName: sub.profName,
    profInstitute: sub.profInstitute,
    studentName: sub.studentName,
    studentInstitute: sub.studentInstitute,
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

async function generateCard(sub, prof) {
  if (sub.type === 'text') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: await profPhotoDataUri(prof),
      media: { kind: 'text', message: sub.message }
    });
    const buffer = await renderPNG(html, { scale: 2 });
    return { buffer, mime: 'image/png', ext: 'png' };
  }

  if (sub.type === 'pdf') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: await profPhotoDataUri(prof),
      media: { kind: 'pdf', fileName: sub.fileName }
    });
    const buffer = await renderPNG(html, { scale: 2 });
    return { buffer, mime: 'image/png', ext: 'png' };
  }

  // video: composite into a single playable MP4, cached in Supabase since it's slow to generate
  const cachedKey = `generated/${sub._id}_card.mp4`;
  try {
    const buffer = await storage.downloadBuffer(cachedKey);
    return { buffer, mime: 'video/mp4', ext: 'mp4' };
  } catch (_) { /* not cached yet */ }

  const sourcePath = await downloadToScratch(sub.filePath);
  const outPath = path.join(SCRATCH_DIR, `out_${crypto.randomBytes(6).toString('hex')}.mp4`);
  try {
    await compositeVideoCard({
      videoPath: sourcePath,
      ...baseData(sub),
      profPhotoDataUri: await profPhotoDataUri(prof),
      outPath
    });
    const buffer = fs.readFileSync(outPath);
    // Best-effort cache under a deterministic key; regenerate next time if this fails.
    await storage.uploadBufferAt(cachedKey, buffer, { contentType: 'video/mp4' }).catch(() => {});
    return { buffer, mime: 'video/mp4', ext: 'mp4' };
  } finally {
    fs.unlinkSync(sourcePath);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  }
}

async function generatePdf(sub, prof) {
  if (sub.type === 'pdf') {
    const buffer = await storage.downloadBuffer(sub.filePath);
    return { buffer, mime: 'application/pdf', ext: 'pdf' };
  }

  if (sub.type === 'text') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: await profPhotoDataUri(prof),
      media: { kind: 'text', message: sub.message }
    });
    const buffer = await renderPDF(html);
    return { buffer, mime: 'application/pdf', ext: 'pdf' };
  }

  // video: PDF with a poster frame + tribute details (video itself is downloaded separately as the "card")
  const sourcePath = await downloadToScratch(sub.filePath);
  const posterPath = path.join(SCRATCH_DIR, `poster_${crypto.randomBytes(6).toString('hex')}.png`);
  try {
    await extractPosterFrame(sourcePath, posterPath);
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: await profPhotoDataUri(prof),
      media: { kind: 'image', src: fileToDataUri(posterPath) }
    });
    const buffer = await renderPDF(html);
    return { buffer, mime: 'application/pdf', ext: 'pdf' };
  } finally {
    fs.unlinkSync(sourcePath);
    if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
  }
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

module.exports = { generateCard, generatePdf, generateProfessorBundlePdf, profPhotoDataUri };
