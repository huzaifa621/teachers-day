// LinkedIn is the only platform with a public "share this URL" endpoint that
// doesn't require API auth — it opens LinkedIn's own compose dialog in a
// popup, pre-filled with a preview card scraped from the page's Open Graph
// tags. (Instagram has no equivalent web share endpoint, so it's
// intentionally not offered here.)
export function openLinkedInShare(url) {
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}
