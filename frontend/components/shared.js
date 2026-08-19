'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../lib/api';
import { getMySubmissionIds } from '../lib/mySubmissions';

export function typeLabel(t) { return t === 'text' ? 'Message' : t === 'video' ? 'Video' : 'PDF'; }

// Font/color/size are fixed by design — students no longer customize them.
// Keep in sync with backend/src/lib/postcard-style.js.
export const FIXED_STYLE = { fontFamily: 'Georgia, serif', textColor: '#2c1810', fontSize: '18px' };

// Shrinks a name's font size as it gets longer so long professor/student
// names don't overflow their box. Keep in sync with the equivalent in
// backend/src/lib/postcard-template.js.
export function nameFontSize(name, base, min = 11) {
  const len = (name || '').trim().length;
  if (len <= 14) return `${base}px`;
  return `${Math.max(min, Math.round(base - (len - 14) * 0.5))}px`;
}

// Renders the full decorative postcard — same markup students see while
// composing — so admins/professors viewing a submission see an identical card.
export function PostcardCard({ submission: s }) {
  return (
    <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
      <div className="postcard-border">
        <div className="postcard-left">
          {s.type === 'text' && <div className="quote" style={{ color: FIXED_STYLE.textColor, fontSize: FIXED_STYLE.fontSize }}>{s.message}</div>}
          {s.type === 'video' && <video controls src={s.fileUrl} />}
          {s.type === 'pdf' && <div className="muted center">{s.fileName || 'PDF tribute'}</div>}
        </div>
        <div className="postcard-divider" />
        <div className="postcard-right">
          <div className="postcard-prof">
            <div className="postcard-prof-img">{s.profPhoto && <img src={s.profPhoto} alt={s.profName} />}</div>
            <div className="postcard-label">To</div>
            <div className="postcard-prof-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(s.profName, 17) }}>{s.profName}</div>
          </div>
          <div>
            <div className="postcard-hr" />
            <div className="postcard-from">
              <div className="postcard-label">From</div>
              <div className="postcard-student-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(s.studentName, 15) }}>{s.studentName}</div>
            </div>
            <div className="postcard-footer-brand">
              <img src="/masai_logo.png" alt="masai" />
              <span>Teachers&apos; Day</span>
            </div>
          </div>
        </div>
        <div className="postcard-stamp">
          <img src="/masai_logo.png" alt="masai" />
          <span>Teachers&apos; Day</span>
        </div>
      </div>
    </div>
  );
}

export function WrongRoleNotice({ role, expected, onLogout }) {
  return (
    <div className="login-container show">
      <div className="login-box">
        <img className="login-logo" src="/masai_logo.png" alt="Masai" />
        <h2>Wrong Portal</h2>
        <p>
          You&apos;re currently logged in as <strong>{role}</strong>. This page is for {expected} only.
          Log out to switch.
        </p>
        <button className="btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

export function groupByInstitute(list, instituteKey) {
  const byInstitute = {};
  list.forEach((item) => { (byInstitute[item[instituteKey]] ||= []).push(item); });
  return Object.entries(byInstitute).sort(([a], [b]) => a.localeCompare(b));
}

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export function SubmissionCard({ s, onView, isAdmin, showStatus, onStatusChange }) {
  const [busy, setBusy] = useState(null);

  let thumb;
  if (s.type === 'text') thumb = <div style={{ fontSize: 36 }}>&#128221;</div>;
  else if (s.type === 'video') thumb = <video muted><source src={s.fileUrl} /></video>;
  else thumb = <div style={{ fontSize: 36 }}>&#128196;</div>;

  return (
    <div className="gallery-card">
      <div className="gallery-thumbnail" onClick={() => onView(s)}>{thumb}</div>
      <div className="gallery-info">
        <div className="gallery-header">
          <span className="gallery-type">{typeLabel(s.type)}</span>
          {(isAdmin || showStatus) && <span className={`gallery-status status-${s.status}`}>{STATUS_LABEL[s.status] || 'Pending'}</span>}
        </div>
        {s.message && <div className="gallery-text">&ldquo;{s.message.slice(0, 90)}&rdquo;</div>}
        {!s.message && s.fileName && <div className="gallery-text">{s.fileName}</div>}
        <div className="gallery-meta">
          <div><strong>To:</strong> {s.profName}</div>
          <div><strong>From:</strong> {s.studentName}</div>
          <div><strong>Date:</strong> {new Date(s.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <button className="gallery-btn" onClick={() => onView(s)}>View</button>
          <button
            className="gallery-btn alt"
            disabled={busy === 'download'}
            onClick={() => { setBusy('download'); downloadFile(`/api/submissions/${s.id}/download`).finally(() => setBusy(null)); }}
          >{busy === 'download' ? 'Preparing...' : 'Download'}</button>
        </div>
        {isAdmin && onStatusChange && (
          <div style={{ marginTop: 8 }}>
            <button
              className="gallery-btn approve"
              disabled={s.status === 'approved'}
              onClick={() => onStatusChange(s.id, 'approved')}
            >Approve</button>
            <button
              className="gallery-btn reject"
              disabled={s.status === 'rejected'}
              onClick={() => onStatusChange(s.id, 'rejected')}
            >Reject</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaModal({ submission, onClose }) {
  if (!submission) return null;
  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content postcard-modal">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <PostcardCard submission={submission} />
      </div>
    </div>
  );
}

// Institute-wise grouped tribute grid, shared by the Gallery tab. Admins get
// Approve/Reject controls; students never see moderation status at all.
export function Gallery({ active, isAdmin, mineOnly }) {
  const [subs, setSubs] = useState([]);
  const [modalSubmission, setModalSubmission] = useState(null);

  // Refetch every time the tab becomes active (rather than once ever) so a
  // tribute submitted in this same session shows up without needing a
  // full page reload/re-login.
  useEffect(() => {
    if (!active) return;
    // "My Tributes" asks the backend for exactly these ids, regardless of
    // moderation status — the plain list only ever returns approved ones,
    // which was hiding a student's own still-pending submissions.
    const path = mineOnly ? `/api/submissions?ids=${getMySubmissionIds().join(',')}` : '/api/submissions';
    api(path).then(setSubs).catch(() => {});
  }, [active, mineOnly]);

  async function onStatusChange(id, status) {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    try {
      await api(`/api/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      // reload on failure so UI reflects the true server state
      api('/api/submissions').then(setSubs).catch(() => {});
    }
  }

  const groups = groupByInstitute(subs, 'profInstitute');

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <div className="top-bar" style={{ marginBottom: 15 }}>
          <h2 style={{ margin: 0 }}>{mineOnly ? 'My Tributes' : 'All Tributes'} ({subs.length})</h2>
        </div>
        {groups.length === 0 && <p className="muted">{mineOnly ? "You haven't submitted any tributes yet." : 'No tributes yet.'}</p>}
        {groups.map(([inst, items]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="gallery-grid">
              {items.map((s) => (
                <SubmissionCard key={s.id} s={s} onView={setModalSubmission} isAdmin={isAdmin} showStatus={mineOnly} onStatusChange={isAdmin ? onStatusChange : null} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <MediaModal submission={modalSubmission} onClose={() => setModalSubmission(null)} />
    </div>
  );
}

// Click-through slider over one professor's approved tributes (text/video/pdf).
export function ProfessorPreviewSlider({ professor, submissions, onClose }) {
  const [index, setIndex] = useState(0);
  if (!professor) return null;

  const s = submissions[index];

  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content slider-modal">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3 style={{ marginBottom: 10 }}>{professor.name} &mdash; {submissions.length ? `${index + 1} / ${submissions.length}` : 'No approved tributes yet'}</h3>
        {s && (
          <div className="slider-body">
            <PostcardCard submission={s} />
          </div>
        )}
        {submissions.length > 1 && (
          <div className="slider-controls">
            <button className="btn-secondary btn-small" onClick={() => setIndex((i) => (i - 1 + submissions.length) % submissions.length)}>&larr; Prev</button>
            <button className="btn-secondary btn-small" onClick={() => setIndex((i) => (i + 1) % submissions.length)}>Next &rarr;</button>
          </div>
        )}
      </div>
    </div>
  );
}
