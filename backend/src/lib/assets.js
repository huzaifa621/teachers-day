const fs = require('fs');
const path = require('path');

const cache = new Map();

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function fileToDataUri(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const b64 = fs.readFileSync(absPath).toString('base64');
  const uri = `data:${mime};base64,${b64}`;
  cache.set(absPath, uri);
  return uri;
}

// Fetches a remote file (e.g. a Supabase Storage public URL) and returns it as a data URI,
// so Puppeteer can embed it directly without a second network hop from inside the page.
async function urlToDataUri(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  const mime = res.headers.get('content-type') || 'application/octet-stream';
  const buf = Buffer.from(await res.arrayBuffer());
  const uri = `data:${mime};base64,${buf.toString('base64')}`;
  cache.set(url, uri);
  return uri;
}

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'masai_logo.png');
const MASAI_LOGO_DATA_URI = fileToDataUri(LOGO_PATH);

module.exports = { fileToDataUri, urlToDataUri, MASAI_LOGO_DATA_URI };
