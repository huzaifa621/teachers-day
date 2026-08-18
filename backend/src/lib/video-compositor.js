const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { getRects } = require('./postcard-layout');
const { renderPNG } = require('./renderer');
const { renderPostcardHTML } = require('./postcard-template');
const { SCRATCH_DIR } = require('./paths');

ffmpeg.setFfmpegPath(ffmpegPath);

const SCALE = 2;

// Renders the postcard frame with a transparent hole where the video goes,
// then has ffmpeg crop/cover the source video into that hole and overlay
// the frame on top, producing a single self-contained MP4.
// videoPath/outPath are local scratch files — caller handles downloading the
// source from and uploading the result to Supabase Storage.
async function compositeVideoCard({
  videoPath,
  profName,
  profInstitute,
  profPhotoDataUri,
  studentName,
  studentInstitute,
  fontFamily,
  textColor,
  outPath
}) {
  const html = renderPostcardHTML({
    profName,
    profInstitute,
    profPhotoDataUri,
    studentName,
    studentInstitute,
    fontFamily,
    textColor,
    transparent: true
  });

  const framePng = await renderPNG(html, { transparent: true, scale: SCALE });
  const frameTmpPath = path.join(SCRATCH_DIR, `frame_${crypto.randomBytes(6).toString('hex')}.png`);
  fs.writeFileSync(frameTmpPath, framePng);

  const rects = getRects();
  const canvasW = rects.canvas.w * SCALE;
  const canvasH = rects.canvas.h * SCALE;
  const holeX = Math.round(rects.leftHole.x * SCALE);
  const holeY = Math.round(rects.leftHole.y * SCALE);
  const holeW = Math.round(rects.leftHole.w * SCALE);
  const holeH = Math.round(rects.leftHole.h * SCALE);

  const filter = [
    `[0:v]scale=${holeW}:${holeH}:force_original_aspect_ratio=increase,crop=${holeW}:${holeH}[vid]`,
    `[vid]pad=${canvasW}:${canvasH}:${holeX}:${holeY}:color=black[vidpad]`,
    `[vidpad][1:v]overlay=0:0:shortest=1[outv]`
  ].join(';');

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(frameTmpPath)
      .complexFilter(filter)
      .outputOptions([
        '-map', '[outv]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-movflags', '+faststart'
      ])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  fs.unlinkSync(frameTmpPath);
  return outPath;
}

// Extracts a single poster-frame image (for the PDF export of video tributes).
async function extractPosterFrame(videoPath, outPngPath) {
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['1'],
        filename: path.basename(outPngPath),
        folder: path.dirname(outPngPath),
        size: '640x?'
      })
      .on('end', resolve)
      .on('error', reject);
  });
  return outPngPath;
}

module.exports = { compositeVideoCard, extractPosterFrame };
