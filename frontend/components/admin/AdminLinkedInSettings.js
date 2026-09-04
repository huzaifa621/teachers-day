'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader, ErrorState } from '../shared';

// Hidden behind Cmd+Shift+P (see AdminPortal) rather than shown in the
// regular tab bar — this edits the one shared caption every faculty
// member's "LinkedIn Link" button uses (see AdminSend.copyLinkedInLink),
// so a typo here affects every professor's link immediately.
export default function AdminLinkedInSettings({ active }) {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlertMsg] = useState(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    api('/api/settings/linkedin-caption')
      .then((data) => setCaption(data.caption))
      .catch((e) => setLoadError(e.message || 'Could not load the current caption.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!active) return;
    load();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!caption.trim()) {
      return setAlertMsg({ type: 'error', text: 'Caption cannot be empty' });
    }
    setSaving(true);
    setAlertMsg(null);
    try {
      const data = await api('/api/settings/linkedin-caption', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: caption.trim() })
      });
      setCaption(data.caption);
      setAlertMsg({ type: 'success', text: 'Saved — every professor’s LinkedIn link now uses this caption.' });
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Update LinkedIn Post</h2>
        <p className="muted">
          This caption is used for every professor&apos;s &quot;LinkedIn Link&quot; button on the
          Send to Faculty tab. Their tribute page link is added above it automatically — don&apos;t include it here.
        </p>

        {loading && <Loader text="Loading current caption…" />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}
        {!loading && !loadError && (
          <>
            {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
            <div className="form-group">
              <label>LinkedIn Caption</label>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={1000}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, padding: 10 }}
              />
              <p className="muted" style={{ marginTop: 4 }}>{caption.length}/1000</p>
            </div>
            <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        )}
      </div>
    </div>
  );
}
