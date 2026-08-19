'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../../lib/api';
import { copyToClipboard } from '../../lib/clipboard';
import { typeLabel, ProfessorPreviewSlider } from '../shared';

export default function AdminSend({ active, professors }) {
  const [subs, setSubs] = useState([]);
  const [previewProf, setPreviewProf] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [csvBusy, setCsvBusy] = useState(false);

  function downloadLinksCsv() {
    setCsvBusy(true);
    downloadFile(`/api/professors/links.csv?origin=${encodeURIComponent(window.location.origin)}`)
      .catch((err) => setLinkError(err.message || 'Could not download CSV.'))
      .finally(() => setCsvBusy(false));
  }

  async function copyLink(profId) {
    try {
      const { token } = await api(`/api/professors/${profId}/link`);
      const url = `${window.location.origin}/p/${token}`;
      await copyToClipboard(url);
      setCopiedId(profId);
      setLinkError(null);
      setTimeout(() => setCopiedId((id) => (id === profId ? null : id)), 2000);
    } catch (err) {
      setLinkError(err.message || 'Could not copy link.');
    }
  }

  useEffect(() => {
    if (!active) return;
    api('/api/submissions').then(setSubs).catch(() => {});
  }, [active]);

  const approvedSubs = subs.filter((s) => s.status === 'approved');

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <div className="top-bar" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Send Tributes to Professors</h2>
          <button className="btn-secondary btn-small" disabled={csvBusy} onClick={downloadLinksCsv}>
            {csvBusy ? 'Preparing...' : 'Download Links CSV'}
          </button>
        </div>
        <p className="muted">Review each professor&apos;s approved tributes, then share their link over email.</p>

        {linkError && <div className="alert show" style={{ display: 'block', background: '#f0e6cf', borderLeft: '4px solid var(--brown)' }}>{linkError}</div>}

        {professors.length === 0 && <p className="muted">No professors yet.</p>}
        {professors.map((p) => {
          const profSubs = approvedSubs.filter((s) => s.profId === p.id);
          return (
            <div key={p.id} className="prof-send-row">
              <div className="who">
                <img src={p.photo} alt={p.name} />
                <div>
                  <div><strong>{p.name}</strong></div>
                  <div className="meta">{p.institute} &middot; {p.designation} &middot; {profSubs.length} approved tribute(s)</div>
                </div>
              </div>
              <div className="actions">
                <button className="btn-secondary btn-small" onClick={() => setPreviewProf(p)}>Preview</button>
                <button className="btn-secondary btn-small" onClick={() => copyLink(p.id)}>
                  {copiedId === p.id ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              {profSubs.length > 0 && (
                <div className="media-list" style={{ width: '100%' }}>
                  {profSubs.map((s) => (
                    <div key={s.id} className="media-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="media-row-thumb">
                          {s.type === 'video' ? <video muted><source src={s.fileUrl} /></video> : <>&#128221;</>}
                        </span>
                        {typeLabel(s.type)} from <strong>{s.studentName}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {previewProf && (
        <ProfessorPreviewSlider
          professor={previewProf}
          submissions={approvedSubs.filter((s) => s.profId === previewProf.id)}
          onClose={() => setPreviewProf(null)}
        />
      )}
    </div>
  );
}
