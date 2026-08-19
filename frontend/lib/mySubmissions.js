// Students aren't authenticated with a real account, so there's no server-side
// way to know "which tributes did this browser submit." We track submission
// ids client-side in localStorage instead, purely to filter the student's own
// Gallery view — it's not a security boundary (nothing prevents someone from
// clearing/editing it), just a convenience so a student doesn't see everyone
// else's approved tributes mixed in with their own.
const KEY = 'td_my_submission_ids';

export function getMySubmissionIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function addMySubmissionIds(ids) {
  if (typeof window === 'undefined' || ids.length === 0) return;
  const merged = Array.from(new Set([...getMySubmissionIds(), ...ids]));
  window.localStorage.setItem(KEY, JSON.stringify(merged));
}
