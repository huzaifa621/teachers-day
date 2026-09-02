'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../lib/api';
import { getMySubmissionIds } from '../lib/mySubmissions';
import { copyToClipboard } from '../lib/clipboard';
import { openLinkedInShare, STUDENT_LINKEDIN_CAPTIONS } from '../lib/share';

export function typeLabel(t) { return t === 'text' ? 'Message' : t === 'video' ? 'Video' : 'PDF'; }

// Font/color/size are fixed by design — students no longer customize them.
// Keep in sync with backend/src/lib/postcard-style.js.
export const FIXED_STYLE = { fontFamily: 'Georgia, serif', textColor: '#2c1810', fontSize: '18px' };

// Shrinks a name's font size as it gets longer so long faculty/student
// names don't overflow their box. Keep in sync with the equivalent in
// backend/src/lib/postcard-template.js.
export function nameFontSize(name, base, min = 11) {
  const len = (name || '').trim().length;
  if (len <= 14) return `${base}px`;
  return `${Math.max(min, Math.round(base - (len - 14) * 0.5))}px`;
}

// Renders the full decorative postcard — same markup students see while
// composing — so admins/facultyList viewing a submission see an identical card.
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
          <div className="postcard-faculty">
            <div className="postcard-faculty-img">{s.facultyPhoto && <img src={s.facultyPhoto} alt={s.facultyName} />}</div>
            <div className="postcard-label">To</div>
            <div className="postcard-faculty-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(s.facultyName, 17) }}>{s.facultyName}</div>
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

// Used everywhere a list is fetched, so a genuinely empty result (0 items)
// never looks identical to "still loading" or "the fetch failed" — those
// three states need distinct UI or a failure silently reads as empty data.
export function Loader({ text = 'Loading…' }) {
  return (
    <div className="loading-row">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-box">
      <span>{message || 'Something went wrong.'}</span>
      {onRetry && <button type="button" className="btn-secondary btn-small" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function groupByInstitute(list, instituteKey) {
  const byInstitute = {};
  list.forEach((item) => { (byInstitute[item[instituteKey]] ||= []).push(item); });
  return Object.entries(byInstitute).sort(([a], [b]) => a.localeCompare(b));
}

// Same idea, but for records whose institute field is an array — a faculty
// member affiliated with three institutes is listed under all three, since
// the directory is browsed by institute.
export function groupByInstitutes(list, institutesKey) {
  const byInstitute = {};
  list.forEach((item) => {
    (item[institutesKey] || []).forEach((inst) => { (byInstitute[inst] ||= []).push(item); });
  });
  return Object.entries(byInstitute).sort(([a], [b]) => a.localeCompare(b));
}

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export function SubmissionCard({ s, onView, isAdmin, onStatusChange, onShareLinkedIn, deleteMode, onDelete }) {
  const [busy, setBusy] = useState(null);

  return (
    <div className="gallery-card">
      <div className="gallery-thumbnail" onClick={() => onView(s)}>
        {s.facultyPhoto && <img src={s.facultyPhoto} alt={s.facultyName} />}
      </div>
      <div className="gallery-info">
        <div className="gallery-header">
          <span className="gallery-type">{typeLabel(s.type)}</span>
          {isAdmin && <span className={`gallery-status status-${s.status}`}>{STATUS_LABEL[s.status] || 'Pending'}</span>}
        </div>
        {s.message && <div className="gallery-text">&ldquo;{s.message.slice(0, 90)}&rdquo;</div>}
        {!s.message && s.fileName && <div className="gallery-text">{s.fileName}</div>}
        <div className="gallery-meta">
          <div><strong>To:</strong> {s.facultyName}</div>
          <div><strong>From:</strong> {s.studentName}</div>
          <div><strong>Date:</strong> {new Date(s.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <button className="gallery-btn" onClick={() => onView(s)}>View</button>
          {isAdmin && (
            <button
              className="gallery-btn alt"
              disabled={busy === 'download'}
              onClick={() => {
                setBusy('download');
                downloadFile(`/api/submissions/${s.id}/download`)
                  .catch((e) => alert(e.message || 'Download failed — try again'))
                  .finally(() => setBusy(null));
              }}
            >{busy === 'download' ? 'Preparing...' : 'Download'}</button>
          )}
          {!isAdmin && (
            <button className="gallery-btn alt" onClick={() => onShareLinkedIn(s)}>Share on LinkedIn</button>
          )}
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
        {isAdmin && deleteMode && onDelete && (
          <div style={{ marginTop: 8 }}>
            <button className="gallery-btn reject" onClick={() => onDelete(s.id)}>Delete</button>
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

// LinkedIn's share dialog can't be handed pre-filled caption text (see
// lib/share.js) — this modal is the deliberate, explicit substitute: the
// student reads the caption, downloads the card, copies the caption, and
// (optionally) opens LinkedIn themselves, each as its own click.
export function LinkedInShareModal({ submission, onClose }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [captionIndex, setCaptionIndex] = useState(0);

  if (!submission) return null;

  const link = `${window.location.origin}/s/${submission.id}`;
  const caption = STUDENT_LINKEDIN_CAPTIONS[captionIndex];

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  }

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadFile(`/api/submissions/${submission.id}/download`);
    } catch (e) {
      showToast(e.message || 'Download failed — try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await copyToClipboard(caption);
      showToast('Post content copied!');
    } catch (_) {
      showToast('Could not copy — try selecting the text manually');
    }
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content linkedin-modal">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3>Share on LinkedIn</h3>
        <p className="muted">Pick a caption, download your card and copy the post, then share it on LinkedIn.</p>
        <div className="caption-tabs" role="tablist" aria-label="Post options">
          {STUDENT_LINKEDIN_CAPTIONS.map((_, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={captionIndex === i}
              className={`caption-tab ${captionIndex === i ? 'active' : ''}`}
              onClick={() => setCaptionIndex(i)}
            >
              Post {i + 1}
            </button>
          ))}
        </div>
        <div className="caption-box">{caption}</div>
        <div className="linkedin-modal-actions">
          <button className="gallery-btn alt" disabled={busy} onClick={handleDownload}>{busy ? 'Preparing...' : 'Download'}</button>
          <button className="gallery-btn alt" onClick={handleCopy}>Copy</button>
          <button className="gallery-btn" onClick={() => openLinkedInShare(link)}>Open LinkedIn</button>
        </div>
      </div>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

// Institute-wise grouped tribute grid, shared by the Gallery tab. Admins get
// Approve/Reject controls; students never see moderation status at all.
export function Gallery({ active, isAdmin, mineOnly }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalSubmission, setModalSubmission] = useState(null);
  const [linkedInSubmission, setLinkedInSubmission] = useState(null);
  // Hidden feature — Cmd/Ctrl+Shift+S reveals per-card Delete buttons. Admin
  // only; the backend also enforces this independently of the UI.
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    function onKeyDown(e) {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setDeleteMode((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin]);

  function load() {
    // "My Tributes" asks the backend for exactly these ids, regardless of
    // moderation status — the plain list only ever returns approved ones,
    // which was hiding a student's own still-pending submissions.
    const path = mineOnly ? `/api/submissions?ids=${getMySubmissionIds().join(',')}` : '/api/submissions';
    setLoading(true);
    setLoadError(null);
    api(path)
      .then((data) => setSubs(data))
      .catch((e) => setLoadError(e.message || 'Could not load tributes.'))
      .finally(() => setLoading(false));
  }

  // Refetch every time the tab becomes active (rather than once ever) so a
  // tribute submitted in this same session shows up without needing a
  // full page reload/re-login.
  useEffect(() => {
    if (!active) return;
    load();
  }, [active, mineOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onStatusChange(id, status) {
    const prevSubs = subs;
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    try {
      await api(`/api/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      // roll back so the UI doesn't silently show a status that never saved
      setSubs(prevSubs);
      alert(`Could not update status: ${e.message || 'unknown error'}`);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this tribute? It will disappear from the gallery everywhere, but stays in the database.')) return;
    const prevSubs = subs;
    setSubs((prev) => prev.filter((s) => s.id !== id));
    try {
      await api(`/api/submissions/${id}`, { method: 'DELETE' });
    } catch (e) {
      setSubs(prevSubs);
      alert(`Could not delete: ${e.message || 'unknown error'}`);
    }
  }

  const groups = groupByInstitute(subs, 'facultyInstitute');

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <div className="top-bar" style={{ marginBottom: 15 }}>
          <h2 style={{ margin: 0 }}>{mineOnly ? 'My Tributes' : 'All Tributes'} ({subs.length})</h2>
        </div>
        {loading && <Loader text="Loading tributes…" />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}
        {!loading && !loadError && groups.length === 0 && <p className="muted">{mineOnly ? "You haven't submitted any tributes yet." : 'No tributes yet.'}</p>}
        {!loading && !loadError && groups.map(([inst, items]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="gallery-grid">
              {items.map((s) => (
                <SubmissionCard key={s.id} s={s} onView={setModalSubmission} isAdmin={isAdmin} onStatusChange={isAdmin ? onStatusChange : null} onShareLinkedIn={setLinkedInSubmission} deleteMode={deleteMode} onDelete={isAdmin ? onDelete : null} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <MediaModal submission={modalSubmission} onClose={() => setModalSubmission(null)} />
      <LinkedInShareModal submission={linkedInSubmission} onClose={() => setLinkedInSubmission(null)} />
    </div>
  );
}

// Click-through slider over one faculty's approved tributes (text/video/pdf).
export function FacultyPreviewSlider({ faculty, submissions, onClose }) {
  const [index, setIndex] = useState(0);
  if (!faculty) return null;

  const s = submissions[index];

  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content slider-modal">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3 style={{ marginBottom: 10 }}>{faculty.name} &mdash; {submissions.length ? `${index + 1} / ${submissions.length}` : 'No approved tributes yet'}</h3>
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
