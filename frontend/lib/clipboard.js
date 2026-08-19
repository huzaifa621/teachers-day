// navigator.clipboard is only available in secure contexts (HTTPS or
// localhost) — on a plain-HTTP deployment (e.g. testing over a raw IP
// before TLS is set up) it's simply undefined, so writeText() throws.
// Falls back to the older execCommand('copy') approach, which still works
// over HTTP, via a temporary offscreen textarea.
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('Copy command was denied');
  } finally {
    document.body.removeChild(textarea);
  }
}
