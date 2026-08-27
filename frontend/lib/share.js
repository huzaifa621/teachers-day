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
// so the closest thing to "autofill" is showing a caption in a modal for the
// student to copy themselves. Three approved variants; the modal shows them
// as tabs so the student picks the voice that fits them.
export const STUDENT_LINKEDIN_CAPTIONS = [
  'Every student has that one teacher who accidentally became a core part of their story. Here’s mine. 💌 #MasaiTeachersDay',
  'Here’s to the teacher who gave us more than notes, assignments, and deadlines — they gave us a little more belief in ourselves. 💌 #MasaiTeachersDay',
  'Teachers: professionally responsible for our learning, unofficially responsible for so much more. Here’s to my favourite one. 💌 #MasaiTeachersDay'
];
