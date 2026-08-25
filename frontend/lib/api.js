// "??" (not "||") so an intentionally empty NEXT_PUBLIC_API_URL — used in
// production once Nginx makes frontend/backend same-origin — is respected
// instead of falling back to the localhost default.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4173';

// For server-side fetches only (Server Components, generateMetadata) —
// unlike a browser, Node's fetch() can't resolve a relative URL against
// "the current page", so an empty API_URL (same-origin-via-Nginx in prod)
// doesn't work there. INTERNAL_API_URL is a plain (non-NEXT_PUBLIC) runtime
// env var pointing at the backend container directly over the Docker
// network (see docker-compose.yml), read fresh on each server request
// instead of being baked into the client bundle at build time.
function serverApiUrl() {
  return process.env.INTERNAL_API_URL || API_URL;
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...opts });
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON response */ }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// Downloads a file from an authenticated API endpoint (blob + Content-Disposition),
// since a plain <a href> can't send the session cookie cross-origin reliably for downloads.
async function downloadFile(path, triggerBtnSetter) {
  if (triggerBtnSetter) triggerBtnSetter(true);
  try {
    const res = await fetch(`${API_URL}${path}`, { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error((data && data.error) || 'Download failed');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : 'download';
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } finally {
    if (triggerBtnSetter) triggerBtnSetter(false);
  }
}

export { API_URL, api, downloadFile, serverApiUrl };
