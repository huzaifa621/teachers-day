// Single source of truth for postcard pixel geometry.
// Used both to generate the CSS for on-screen/export renders AND to compute
// the exact rectangle ffmpeg must composite the video into, so the two can
// never drift apart.

const LAYOUT = {
  width: 1200,
  height: 750,
  borderWidth: 26,
  contentPadding: 30,
  gap: 34,
  // Tribute text/video gets 65% of the postcard; the remaining 35% carries
  // the fixed elements (faculty photo, names, masai branding).
  leftRatio: 0.65
};

function getRects() {
  const { width, height, borderWidth, contentPadding, gap, leftRatio } = LAYOUT;

  const contentX = borderWidth + contentPadding;
  const contentY = borderWidth + contentPadding;
  const contentW = width - 2 * (borderWidth + contentPadding);
  const contentH = height - 2 * (borderWidth + contentPadding);
  const leftWidth = Math.round((contentW - gap) * leftRatio);

  const leftHole = { x: contentX, y: contentY, w: leftWidth, h: contentH };
  const rightPanel = {
    x: contentX + leftWidth + gap,
    y: contentY,
    w: contentW - leftWidth - gap,
    h: contentH
  };
  const dividerX = contentX + leftWidth + gap / 2;

  return { canvas: { w: width, h: height }, contentX, contentY, contentW, contentH, leftHole, rightPanel, dividerX };
}

module.exports = { LAYOUT, getRects };
