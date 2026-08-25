// LinkedIn is the only platform with a public "share this URL" endpoint that
// doesn't require API auth — it opens LinkedIn's own compose dialog in a
// popup, pre-filled with a preview card scraped from the page's Open Graph
// tags. (Instagram has no equivalent web share endpoint, so it's
// intentionally not offered here.)
export function openLinkedInShare(url) {
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

// LinkedIn's share dialog never accepts pre-filled caption text (see above) —
// so the closest thing to "autofill" is showing this caption in a modal for
// the student to copy themselves. PLACEHOLDER body copy — swap in the real
// template once provided; hashtags are fixed per requirements.
export function studentLinkedInCaption({ studentName, profName, link }) {
  return `I just sent a Teachers' Day tribute to ${profName}! 🎉\n\nCheck it out here: ${link}\n\n#masaiteachersday #gratitude`;
}
