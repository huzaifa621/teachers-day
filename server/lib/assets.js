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

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'masai_logo.png');
const MASAI_LOGO_DATA_URI = fileToDataUri(LOGO_PATH);

module.exports = { fileToDataUri, MASAI_LOGO_DATA_URI };
