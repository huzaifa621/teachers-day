const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPNG, renderPDF, mergePDFs } = require('./renderer');
const { renderPostcardHTML } = require('./postcard-template');
const { compositeVideoCard, extractPosterFrame } = require('./video-compositor');
const { fileToDataUri } = require('./assets');
const { abs, DIRS } = require('./paths');

function profPhotoDataUri(prof) {
  return fileToDataUri(abs(prof.photo_path));
}

function baseData(sub) {
  return {
    profName: sub.prof_name,
    profInstitute: sub.prof_institute,
    studentName: sub.student_name,
    studentInstitute: sub.student_institute,
    fontFamily: sub.font_family,
    textColor: sub.text_color
  };
}

async function generateCard(sub, prof) {
  if (sub.type === 'text') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: profPhotoDataUri(prof),
      media: { kind: 'text', message: sub.message }
    });
    const buffer = await renderPNG(html, { scale: 2 });
    return { buffer, mime: 'image/png', ext: 'png' };
  }

  if (sub.type === 'pdf') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: profPhotoDataUri(prof),
      media: { kind: 'pdf', fileName: sub.file_name }
    });
    const buffer = await renderPNG(html, { scale: 2 });
    return { buffer, mime: 'image/png', ext: 'png' };
  }

  // video: composite into a single playable MP4, cached on disk since it's slow to generate
  const cachedPath = path.join(DIRS.generated, `${sub.id}_card.mp4`);
  if (!fs.existsSync(cachedPath)) {
    await compositeVideoCard({
      videoPath: abs(sub.file_path),
      ...baseData(sub),
      profPhotoDataUri: profPhotoDataUri(prof),
      outPath: cachedPath
    });
  }
  return { buffer: fs.readFileSync(cachedPath), mime: 'video/mp4', ext: 'mp4' };
}

async function generatePdf(sub, prof) {
  if (sub.type === 'pdf') {
    return { buffer: fs.readFileSync(abs(sub.file_path)), mime: 'application/pdf', ext: 'pdf' };
  }

  if (sub.type === 'text') {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: profPhotoDataUri(prof),
      media: { kind: 'text', message: sub.message }
    });
    const buffer = await renderPDF(html);
    return { buffer, mime: 'application/pdf', ext: 'pdf' };
  }

  // video: PDF with a poster frame + tribute details (video itself is downloaded separately as the "card")
  const posterPath = path.join(DIRS.tmp, `poster_${crypto.randomBytes(6).toString('hex')}.png`);
  await extractPosterFrame(abs(sub.file_path), posterPath);
  const html = renderPostcardHTML({
    ...baseData(sub),
    profPhotoDataUri: profPhotoDataUri(prof),
    media: { kind: 'image', src: fileToDataUri(posterPath) }
  });
  const buffer = await renderPDF(html);
  fs.unlinkSync(posterPath);
  return { buffer, mime: 'application/pdf', ext: 'pdf' };
}

async function generateProfessorBundlePdf(prof, textSubmissions) {
  const buffers = [];
  for (const sub of textSubmissions) {
    const html = renderPostcardHTML({
      ...baseData(sub),
      profPhotoDataUri: profPhotoDataUri(prof),
      media: { kind: 'text', message: sub.message }
    });
    buffers.push(await renderPDF(html));
  }
  return mergePDFs(buffers);
}

module.exports = { generateCard, generatePdf, generateProfessorBundlePdf, profPhotoDataUri };
