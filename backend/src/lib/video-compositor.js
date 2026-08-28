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

// GIFs encode every frame as an image with no interframe compression, so unlike
// the postcard PNG this renders at 1x (not retina) and a modest frame rate —
// full resolution/frame-rate would make an unshareably large file.
const SCALE = 1;
const FPS = 10;
const MAX_DURATION_SEC = 10;

// Renders the postcard frame with a transparent hole where the video goes,
// then has ffmpeg crop/cover a short loop of the source video into that hole
// and overlay the frame on top, producing a single palette-optimized GIF.
// videoPath/outPath are local scratch files — caller handles downloading the
// source from and uploading the result to Supabase Storage.
async function compositeVideoGif({
  videoPath,
  facultyName,
  facultyPhotoDataUri,
  studentName,
  fontFamily,
  textColor,
  outPath
}) {
  const html = renderPostcardHTML({
    facultyName,
    facultyPhotoDataUri,
    studentName,
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

  // Fit the (trimmed) video within the hole preserving its aspect ratio (no
  // crop/zoom), letterboxed with the postcard's parchment tone, place that
  // box into the full canvas at the hole's position, then palette-optimize
  // for GIF (generate a palette from the composited frames, then re-encode
  // against it — much better quality than ffmpeg's default GIF encoder).
  const filter = [
    `[0:v]trim=duration=${MAX_DURATION_SEC},setpts=PTS-STARTPTS,scale=${holeW}:${holeH}:force_original_aspect_ratio=decrease,pad=${holeW}:${holeH}:(ow-iw)/2:(oh-ih)/2:color=0xf2e3b6[vidfit]`,
    `[vidfit]pad=${canvasW}:${canvasH}:${holeX}:${holeY}:color=black[vidpad]`,
    `[vidpad][1:v]overlay=0:0:shortest=1[outv]`,
    `[outv]fps=${FPS}[gifv]`,
    `[gifv]split[a][b]`,
    `[a]palettegen=stats_mode=diff[p]`,
    `[b][p]paletteuse=dither=bayer:bayer_scale=3[final]`
  ].join(';');

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      // The frame is a single still PNG — without "-loop 1" its input stream
      // ends after one frame, and overlay's shortest=1 then cuts the whole
      // output down to that same near-zero duration.
      .input(frameTmpPath).inputOptions(['-loop', '1'])
      .complexFilter(filter)
      .outputOptions(['-map', '[final]', '-loop', '0'])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  fs.unlinkSync(frameTmpPath);
  return outPath;
}

module.exports = { compositeVideoGif };
