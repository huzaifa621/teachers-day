// A random id generated once per browser and kept in localStorage, sent
// along with every submission so admins have a stable, network-independent
// way to notice "this browser submitted before" — unlike IP, it doesn't
// change when the student switches wifi/mobile data. Not a security
// boundary: resets if the student clears site data, uses incognito, or
// submits from a different browser/device.
const KEY = 'td_device_id';

export function getDeviceId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch (_) {
    return null;
  }
}
