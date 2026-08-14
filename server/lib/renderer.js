const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const { LAYOUT } = require('./postcard-layout');

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

async function withPage(fn, { scale = 2 } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: LAYOUT.width, height: LAYOUT.height, deviceScaleFactor: scale });
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function renderPNG(html, { transparent = false, scale = 2 } = {}) {
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return page.screenshot({ type: 'png', omitBackground: transparent });
  }, { scale });
}

async function renderPDF(html) {
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return page.pdf({
      width: `${LAYOUT.width}px`,
      height: `${LAYOUT.height}px`,
      printBackground: true,
      pageRanges: '1',
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
  });
}

async function mergePDFs(buffers) {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { renderPNG, renderPDF, mergePDFs, closeBrowser, getBrowser };
