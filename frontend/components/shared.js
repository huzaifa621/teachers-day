'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../lib/api';

export function typeLabel(t) { return t === 'text' ? 'Message' : t === 'video' ? 'Video' : 'PDF'; }

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

export function SubmissionCard({ s, onView, isAdmin, onStatusChange }) {
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
          {isAdmin && <span className={`gallery-status status-${s.status}`}>{STATUS_LABEL[s.status] || 'Pending'}</span>}
        </div>
        {s.type === 'text' && <div className="gallery-text">&ldquo;{(s.message || '').slice(0, 90)}&rdquo;</div>}
        {s.type !== 'text' && <div className="gallery-text">{s.fileName || ''}</div>}
        <div className="gallery-meta">
          <div><strong>To:</strong> {s.profName}</div>
          <div><strong>From:</strong> {s.studentName}</div>
          <div><strong>Date:</strong> {new Date(s.createdAt).toLocaleString()}</div>
        </div>
        <div>
          {s.type !== 'text' && <button className="gallery-btn" onClick={() => onView(s)}>View</button>}
          <button
            className="gallery-btn alt"
            disabled={busy === 'pdf'}
            onClick={() => { setBusy('pdf'); downloadFile(`/api/submissions/${s.id}/download/pdf`).finally(() => setBusy(null)); }}
          >{busy === 'pdf' ? 'Preparing...' : 'PDF'}</button>
          <button
            className="gallery-btn alt"
            disabled={busy === 'card'}
            onClick={() => { setBusy('card'); downloadFile(`/api/submissions/${s.id}/download/card`).finally(() => setBusy(null)); }}
          >{busy === 'card' ? 'Preparing...' : 'Card'}</button>
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
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>&times;</button>
        {submission.type === 'video' && <video controls autoPlay><source src={submission.fileUrl} /></video>}
        {submission.type === 'pdf' && <iframe src={submission.fileUrl} />}
      </div>
    </div>
  );
}

// Institute-wise grouped tribute grid, shared by the Gallery tab. Admins get
// Approve/Reject controls; students never see moderation status at all.
export function Gallery({ active, isAdmin }) {
  const [subs, setSubs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalSubmission, setModalSubmission] = useState(null);

  useEffect(() => {
    if (!active || loaded) return;
    api('/api/submissions').then((list) => { setSubs(list); setLoaded(true); }).catch(() => setLoaded(true));
  }, [active, loaded]);

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
          <h2 style={{ margin: 0 }}>All Tributes ({subs.length})</h2>
        </div>
        {groups.length === 0 && <p className="muted">No tributes yet.</p>}
        {groups.map(([inst, items]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="gallery-grid">
              {items.map((s) => (
                <SubmissionCard key={s.id} s={s} onView={setModalSubmission} isAdmin={isAdmin} onStatusChange={isAdmin ? onStatusChange : null} />
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
            <div className="gallery-meta" style={{ marginBottom: 10 }}>
              <div><strong>From:</strong> {s.studentName}</div>
              <div><strong>Type:</strong> {typeLabel(s.type)}</div>
            </div>
            {s.type === 'text' && <div className="quote" style={{ fontSize: 22 }}>&ldquo;{s.message}&rdquo;</div>}
            {s.type === 'video' && <video controls src={s.fileUrl} style={{ maxWidth: '100%', maxHeight: '60vh' }} />}
            {s.type === 'pdf' && <iframe src={s.fileUrl} style={{ width: '80vw', height: '60vh', border: 'none' }} />}
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
