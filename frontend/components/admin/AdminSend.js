'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../../lib/api';
import { copyToClipboard } from '../../lib/clipboard';
import { typeLabel, FacultyPreviewSlider, Loader, ErrorState, FacultyPhoto } from '../shared';
import { buildLinkedInAutofillUrl } from '../../lib/share';

export default function AdminSend({ active, facultyList, facultyLoading, facultyError, onRetryFaculty }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [previewFaculty, setPreviewFaculty] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedLinkedInId, setCopiedLinkedInId] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [csvBusy, setCsvBusy] = useState(false);

  function downloadLinksCsv() {
    setCsvBusy(true);
    downloadFile('/api/faculty/links.csv')
      .catch((err) => setLinkError(err.message || 'Could not download CSV.'))
      .finally(() => setCsvBusy(false));
  }

  async function copyLink(facultyId) {
    try {
      // The backend builds the full URL against the real deployed domain
      // (PUBLIC_SITE_URL) — not window.location.origin, which would leak
      // "localhost" into the copied link if the admin is testing locally
      // against the production database.
      const { url } = await api(`/api/faculty/${facultyId}/link`);
      await copyToClipboard(url);
      setCopiedId(facultyId);
      setLinkError(null);
      setTimeout(() => setCopiedId((id) => (id === facultyId ? null : id)), 2000);
    } catch (err) {
      setLinkError(err.message || 'Could not copy link.');
    }
  }

  // Admins aren't the ones posting — the faculty member is, from their own
  // LinkedIn account — so this copies the autofill link (caption + tribute
  // link baked in) rather than opening LinkedIn under the admin's session.
  // Paste it into the email template so the faculty member just clicks it.
  // The caption is fetched fresh on every click (not cached in state) so an
  // edit made in the hidden "Update LinkedIn Post" tab is picked up
  // immediately, with no stale-state coordination between the two tabs.
  async function copyLinkedInLink(facultyId) {
    try {
      const [{ url }, { caption }] = await Promise.all([
        api(`/api/faculty/${facultyId}/link`),
        api('/api/settings/linkedin-caption')
      ]);
      const text = `${url}\n\n${caption}`;
      await copyToClipboard(buildLinkedInAutofillUrl(text));
      setCopiedLinkedInId(facultyId);
      setLinkError(null);
      setTimeout(() => setCopiedLinkedInId((id) => (id === facultyId ? null : id)), 2000);
    } catch (err) {
      setLinkError(err.message || 'Could not copy LinkedIn link.');
    }
  }

  function loadSubs() {
    setLoading(true);
    setLoadError(null);
    api('/api/submissions')
      .then(setSubs)
      .catch((e) => setLoadError(e.message || 'Could not load tributes.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!active) return;
    loadSubs();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const approvedSubs = subs.filter((s) => s.status === 'approved');

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <div className="top-bar" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Send Tributes to Faculty</h2>
          <button className="btn-secondary btn-small" disabled={csvBusy} onClick={downloadLinksCsv}>
            {csvBusy ? 'Preparing...' : 'Download Links CSV'}
          </button>
        </div>
        <p className="muted">Review each faculty&apos;s approved tributes, then share their link over email.</p>

        {linkError && <div className="alert show" style={{ display: 'block', background: '#f0e6cf', borderLeft: '4px solid var(--brown)' }}>{linkError}</div>}

        {(loading || facultyLoading) && <Loader text="Loading tributes…" />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={loadSubs} />}
        {!facultyLoading && facultyError && <ErrorState message={facultyError} onRetry={onRetryFaculty} />}
        {!loading && !loadError && !facultyLoading && !facultyError && facultyList.length === 0 && <p className="muted">No faculty yet.</p>}
        {!loading && !loadError && !facultyLoading && !facultyError && facultyList.map((p) => {
          const memberSubs = approvedSubs.filter((s) => s.facultyId === p.id);
          return (
            <div key={p.id} className="faculty-send-row">
              <div className="who">
                <FacultyPhoto src={p.photo} alt={p.name} />
                <div>
                  <div><strong>{p.name}</strong></div>
                  <div className="meta">{(p.institutes || []).join(' · ')} &middot; {memberSubs.length} approved tribute(s)</div>
                </div>
              </div>
              <div className="actions">
                <button className="btn-secondary btn-small" onClick={() => setPreviewFaculty(p)}>Preview</button>
                <button className="btn-secondary btn-small" onClick={() => copyLink(p.id)}>
                  {copiedId === p.id ? 'Copied!' : 'Tribute Cards Link'}
                </button>
                <button className="btn-secondary btn-small" onClick={() => copyLinkedInLink(p.id)}>
                  {copiedLinkedInId === p.id ? 'Copied!' : 'LinkedIn Link'}
                </button>
              </div>
              {memberSubs.length > 0 && (
                <div className="media-list" style={{ width: '100%' }}>
                  {memberSubs.map((s) => (
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
      {previewFaculty && (
        <FacultyPreviewSlider
          faculty={previewFaculty}
          submissions={approvedSubs.filter((s) => s.facultyId === previewFaculty.id)}
          onClose={() => setPreviewFaculty(null)}
        />
      )}
    </div>
  );
}
