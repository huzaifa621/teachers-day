import { api } from './api';

// Files go browser -> S3 directly, never through our API. The backend only
// signs the request (POST /api/uploads/<kind>) and later accepts the key it
// signed; the bytes never touch the app server, which keeps large video
// tributes off its RAM and inbound bandwidth.
//
// XHR rather than fetch() purely for upload progress events — fetch still has
// no way to observe request-body progress.
function putToS3(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    // Must match the ContentType the URL was signed with, or S3 rejects it.
    xhr.setRequestHeader('Content-Type', file.type);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      reject(new Error(`Upload failed (${xhr.status}) — please try again`));
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });
}

// kind is 'video' or 'photo'. Returns { key, token } to hand back to the API
// call that saves the record.
export async function uploadDirect(kind, file, onProgress) {
  const { url, key, token } = await api(`/api/uploads/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size })
  });
  await putToS3(url, file, onProgress);
  return { key, token };
}
