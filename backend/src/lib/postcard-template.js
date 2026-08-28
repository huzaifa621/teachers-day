const { LAYOUT, getRects } = require('./postcard-layout');
const { MASAI_LOGO_DATA_URI } = require('./assets');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Shrinks a name's font size as it gets longer so long faculty/student
// names don't overflow their box. Keep in sync with the equivalent in
// frontend/components/shared.js (nameFontSize).
function nameFontSize(name, base, min = 13) {
  const len = String(name ?? '').trim().length;
  if (len <= 14) return `${base}px`;
  return `${Math.max(min, Math.round(base - (len - 14) * 0.6))}px`;
}

// media: { kind: 'text', message } | { kind: 'pdf', fileName } | { kind: 'image', src } | { kind: 'hole' }
function renderPostcardHTML({
  facultyName,
  facultyPhotoDataUri,
  studentName,
  media,
  fontFamily = 'Georgia, serif',
  textColor = '#2c1810',
  fontSize = '18px',
  transparent = false
}) {
  const rects = getRects();
  const { canvas, leftHole, rightPanel, dividerX, contentY, contentH } = rects;
  const { borderWidth } = LAYOUT;

  let leftContent = '';
  if (!transparent) {
    if (media?.kind === 'text') {
      leftContent = `
        <div class="quote-mark">&ldquo;</div>
        <div class="message-text">${escapeHtml(media.message).replace(/\n/g, '<br>')}</div>
      `;
    } else if (media?.kind === 'pdf') {
      leftContent = `
        <div class="pdf-slot">
          <div class="pdf-icon">&#128196;</div>
          <div class="pdf-name">${escapeHtml(media.fileName || 'tribute.pdf')}</div>
        </div>
      `;
    } else if (media?.kind === 'image') {
      leftContent = `<img class="left-image" src="${media.src}" alt="tribute">`;
    }
  }

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${canvas.w}px; height: ${canvas.h}px; background: ${transparent ? 'transparent' : '#f2e3b6'}; }
    body { font-family: ${fontFamily}; position: relative; overflow: hidden; }

    .frame {
      position: absolute; inset: 0;
      ${transparent ? '' : `
      background:
        radial-gradient(ellipse at 12% 18%, rgba(178,146,86,0.16) 0%, transparent 55%),
        radial-gradient(ellipse at 88% 82%, rgba(178,146,86,0.14) 0%, transparent 55%),
        #f2e3b6;
      `}
    }

    /* The decorative border, right info panel and stamp always render fully
       opaque, in both modes — only .left-hole is ever left transparent, so
       ffmpeg can composite a video into that exact rectangle underneath. */
    .border-box {
      position: absolute;
      left: ${borderWidth / 2}px; top: ${borderWidth / 2}px;
      right: ${borderWidth / 2}px; bottom: ${borderWidth / 2}px;
      border: ${borderWidth}px solid #3d2f1c;
      border-radius: 6px;
      box-shadow: 0 10px 24px rgba(90,70,40,0.28), inset 0 0 0 3px #c9ac74${transparent ? '' : ', inset 0 0 60px rgba(170,138,80,0.18)'};
    }
    .border-box::before {
      content: '';
      position: absolute; inset: 10px;
      border: 1.5px solid rgba(201,172,116,0.9);
      border-radius: 3px;
      pointer-events: none;
    }

    .left-hole {
      position: absolute;
      left: ${leftHole.x}px; top: ${leftHole.y}px;
      width: ${leftHole.w}px; height: ${leftHole.h}px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .quote-mark {
      position: absolute; top: -6px; left: 14px;
      font-family: Georgia, serif; font-size: 90px; color: rgba(139,111,71,0.28);
      line-height: 1;
    }
    .message-text {
      color: ${textColor};
      font-size: ${fontSize}; line-height: 1.55; text-align: center;
      padding: 40px 30px; white-space: pre-wrap; word-wrap: break-word;
    }
    .pdf-slot { text-align: center; color: #8b6f47; }
    .pdf-icon { font-size: 64px; margin-bottom: 10px; }
    .pdf-name { font-size: 16px; color: #6b5344; max-width: 380px; word-wrap: break-word; }
    .left-image { width: 100%; height: 100%; object-fit: contain; }

    .divider {
      position: absolute;
      left: ${dividerX}px; top: ${contentY}px;
      width: 0; height: ${contentH}px;
      border-left: 2px dashed rgba(139,111,71,0.55);
    }

    .right-panel {
      position: absolute;
      left: ${rightPanel.x}px; top: ${rightPanel.y}px;
      width: ${rightPanel.w}px; height: ${rightPanel.h}px;
      display: flex;
      flex-direction: column; justify-content: space-between;
      background: #f2e3b6;
      border-radius: 4px;
      padding: 4px 2px;
    }
    .faculty-block { text-align: center; margin-top: 90px; }
    .faculty-photo {
      width: 132px; height: 158px; margin: 0 auto 14px;
      border: 3px solid #8b6f47; border-radius: 3px; overflow: hidden;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15); background: #d4c5b9;
    }
    .faculty-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .label { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #6b5344; margin-bottom: 3px; text-transform: uppercase; }
    .faculty-name { font-size: ${nameFontSize(facultyName, 22)}; color: ${textColor}; font-weight: 600; word-wrap: break-word; }
    .hr { height: 1px; background: linear-gradient(90deg, transparent, #8b6f47, transparent); margin: 16px 0; }
    .from-block { text-align: center; }
    .student-name { font-size: ${nameFontSize(studentName, 18)}; color: ${textColor}; font-weight: 600; word-wrap: break-word; }

    .footer-brand { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; opacity: 0.85; }
    .footer-brand img { height: 19px; width: auto; display: block; }
    .footer-brand span { font-size: 10px; letter-spacing: 1.5px; color: #6b5344; text-transform: uppercase; line-height: 19px; }

    .stamp {
      position: absolute; top: 5px; right: 5px;
      width: 104px; height: 104px; border-radius: 50%;
      background: #f7efdb;
      display: flex;
      align-items: center; justify-content: center; flex-direction: column;
      box-shadow: 0 3px 8px rgba(0,0,0,0.18);
    }
    .stamp::before {
      content: '';
      position: absolute; inset: 4px; border-radius: 50%;
      border: 2px dashed #8b6f47;
    }
    .stamp img { width: 66%; height: auto; margin-bottom: 4px; }
    .stamp-caption { font-size: 7px; letter-spacing: 1px; color: #6b5344; text-transform: uppercase; }
  `;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
  <div class="frame"></div>
  <div class="border-box"></div>
  <div class="left-hole">${leftContent}</div>
  <div class="divider"></div>
  <div class="right-panel">
    <div class="faculty-block">
      <div class="faculty-photo">${facultyPhotoDataUri ? `<img src="${facultyPhotoDataUri}" alt="${escapeHtml(facultyName)}">` : ''}</div>
      <div class="label">To</div>
      <div class="faculty-name">${escapeHtml(facultyName)}</div>
    </div>
    <div>
      <div class="hr"></div>
      <div class="from-block">
        <div class="label">From</div>
        <div class="student-name">${escapeHtml(studentName)}</div>
      </div>
      <div class="footer-brand">
        <img src="${MASAI_LOGO_DATA_URI}" alt="masai">
        <span>Teachers' Day</span>
      </div>
    </div>
  </div>
  <div class="stamp">
    <img src="${MASAI_LOGO_DATA_URI}" alt="masai">
    <div class="stamp-caption">Teachers' Day</div>
  </div>
</body>
</html>`;
}

module.exports = { renderPostcardHTML, escapeHtml };
