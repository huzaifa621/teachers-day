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

// Shared Tailwind class strings — kept here (rather than re-typed per file)
// so every screen's buttons/forms/containers stay pixel-identical and don't
// drift from each other over time.
export const ui = {
  container: 'mx-auto max-w-[1600px] p-5',
  btn: 'w-full rounded-md border border-brown bg-gradient-to-br from-[#a0885a] to-brown px-6 py-3 font-serif text-sm text-[#fef8f0] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition duration-200 hover:from-brown hover:to-[#7a5e38] disabled:cursor-not-allowed disabled:opacity-60 max-[480px]:text-[13px]',
  btnFull: 'mt-[18px] w-full',
  btnSecondary: 'w-auto rounded-md border border-brown bg-transparent px-[18px] py-[10px] font-serif text-[13px] text-brown-deep transition duration-200 hover:bg-[#e8d9a8] max-[480px]:text-[13px]',
  btnSecondaryDanger: 'text-danger border-danger hover:bg-[#f0d7d7]',
  btnSmall: 'w-auto px-[14px] py-2 text-xs',
  logoutBtn: 'ml-auto w-auto bg-gradient-to-br from-[#a54c4c] to-danger',
  topBar: 'mb-5 flex flex-wrap items-center justify-between gap-3',
  brandRow: 'flex items-center gap-3.5',
  brandLogo: 'h-[30px] w-auto max-[480px]:h-6',
  h1: 'text-2xl tracking-wide text-ink max-[480px]:text-[19px]',
  tabs: 'mb-[25px] flex flex-wrap gap-2.5 border-b-2 border-brown max-[480px]:mb-[18px] max-[480px]:gap-1.5',
  tabBtn: 'rounded-t-md border-none bg-white/70 px-[18px] py-[11px] font-serif text-sm text-muted transition duration-200 max-[480px]:px-3 max-[480px]:py-2.5 max-[480px]:text-[13px]',
  tabBtnActive: 'border-b-[3px] border-brown bg-white font-semibold text-ink',
  formSection: 'rounded-[10px] border-2 border-brown bg-parchment-card p-[25px] max-[480px]:p-4',
  formSectionNested: 'mt-5 rounded-[10px] border-2 border-brown bg-parchment-card p-[18px]',
  h2: 'mb-5 text-lg text-ink max-[480px]:mb-4 max-[480px]:text-base',
  h3: 'mb-3 text-sm text-ink',
  formRow: 'grid grid-cols-2 gap-5 max-[900px]:grid-cols-1',
  formRow3: 'grid grid-cols-3 gap-[15px] max-[900px]:grid-cols-1',
  formGroup: 'mb-[15px] text-left',
  label: 'mb-1.5 block text-[13px] font-semibold text-ink',
  input: 'w-full rounded-md border border-border px-3 py-2.5 font-serif text-[13px] text-ink',
  alert: 'mb-[18px] rounded-md p-[13px_15px] text-[13px]',
  alertSuccess: 'bg-[#d4e8d4] border-l-4 border-success text-[#1a4d1a]',
  alertError: 'bg-[#f0d7d7] border-l-4 border-danger text-[#4d2222]',
  muted: 'text-xs text-muted',
  professorGrid: 'mt-2.5 grid max-h-[340px] grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3 overflow-y-auto rounded-md border border-border p-3 max-[480px]:max-h-[280px] max-[480px]:grid-cols-[repeat(auto-fill,minmax(92px,1fr))]',
  profCard: 'cursor-pointer rounded-md border-2 border-border bg-white p-2 text-center transition duration-200 hover:border-brown hover:bg-[#f5efe0] [&_img]:mb-1.5 [&_img]:h-20 [&_img]:w-full [&_img]:rounded-[3px] [&_img]:object-cover [&_p]:text-[10px] [&_p]:leading-[1.25]',
  profCardSelected: 'border-brown bg-[#d4c5b9]',
  uploadArea: 'cursor-pointer rounded-lg border-2 border-dashed border-brown bg-white/50 p-[22px] text-center transition duration-200 hover:bg-[#f5efe0]',
  statsGrid: 'mb-2.5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[15px]',
  statCard: 'rounded-md border border-border bg-parchment-card p-5 text-center',
  settingsBox: 'rounded-md border-l-4 border-brown bg-[#f5efe0] p-5'
};

// Renders the full decorative postcard — same markup students see while
// composing — so admins/professors viewing a submission see an identical card.
export function PostcardCard({ submission: s }) {
  return (
    <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
      <div className="postcard-border">
        <div className="postcard-left">
          {s.type === 'text' && <div className="quote" style={{ color: FIXED_STYLE.textColor, fontSize: FIXED_STYLE.fontSize }}>{s.message}</div>}
          {s.type === 'video' && <video controls src={s.fileUrl} />}
          {s.type === 'pdf' && <div className="w-full text-center text-xs text-muted">{s.fileName || 'PDF tribute'}</div>}
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
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-[400px] rounded-[10px] border-[3px] border-brown bg-parchment-card p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <img className="mx-auto mb-[18px] h-[34px]" src="/masai_logo.png" alt="Masai" />
        <h2 className="mb-1.5 text-[22px] text-ink">Wrong Portal</h2>
        <p className="mb-5 text-sm text-muted">
          You&apos;re currently logged in as <strong>{role}</strong>. This page is for {expected} only.
          Log out to switch.
        </p>
        <button className={ui.btn} onClick={onLogout}>Logout</button>
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
const STATUS_BG = { pending: 'bg-[#a08030]', approved: 'bg-success', rejected: 'bg-danger' };

const galleryBtn = 'mr-1.5 mt-2.5 rounded font-serif text-[11px] text-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50';

export function SubmissionCard({ s, onView, isAdmin, showStatus, onStatusChange }) {
  const [busy, setBusy] = useState(null);

  let thumb;
  if (s.type === 'text') thumb = <div style={{ fontSize: 36 }}>&#128221;</div>;
  else if (s.type === 'video') thumb = <video muted><source src={s.fileUrl} /></video>;
  else thumb = <div style={{ fontSize: 36 }}>&#128196;</div>;

  return (
    <div className="overflow-hidden rounded-lg border-2 border-brown bg-parchment-card shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)]">
      <div className="flex h-[170px] w-full cursor-pointer items-center justify-center overflow-hidden bg-[#d4c5b9] text-brown [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover" onClick={() => onView(s)}>{thumb}</div>
      <div className="p-[15px]">
        <div className="mb-2.5 flex items-start justify-between">
          <span className="inline-block rounded-sm bg-brown px-[9px] py-[3px] text-[10px] tracking-wide text-white uppercase">{typeLabel(s.type)}</span>
          {(isAdmin || showStatus) && <span className={`rounded-sm px-[9px] py-[3px] text-[10px] tracking-wide text-white uppercase ${STATUS_BG[s.status] || STATUS_BG.pending}`}>{STATUS_LABEL[s.status] || 'Pending'}</span>}
        </div>
        {s.message && <div className="mb-2.5 max-h-[55px] overflow-hidden text-xs leading-relaxed">&ldquo;{s.message.slice(0, 90)}&rdquo;</div>}
        {!s.message && s.fileName && <div className="mb-2.5 max-h-[55px] overflow-hidden text-xs leading-relaxed">{s.fileName}</div>}
        <div className="text-[10px] leading-relaxed text-muted">
          <div><strong>To:</strong> {s.profName}</div>
          <div><strong>From:</strong> {s.studentName}</div>
          <div><strong>Date:</strong> {new Date(s.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <button className={`${galleryBtn} bg-brown hover:bg-[#7a5e38]`} onClick={() => onView(s)}>View</button>
          <button
            className={`${galleryBtn} bg-brown-deep hover:bg-[#7a5e38]`}
            disabled={busy === 'download'}
            onClick={() => { setBusy('download'); downloadFile(`/api/submissions/${s.id}/download`).finally(() => setBusy(null)); }}
          >{busy === 'download' ? 'Preparing...' : 'Download'}</button>
        </div>
        {isAdmin && onStatusChange && (
          <div className="mt-2">
            <button
              className={`${galleryBtn} bg-success hover:bg-[#7a5e38]`}
              disabled={s.status === 'approved'}
              onClick={() => onStatusChange(s.id, 'approved')}
            >Approve</button>
            <button
              className={`${galleryBtn} bg-danger hover:bg-[#7a5e38]`}
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative max-h-[90%] w-[760px] max-w-[90%] overflow-auto rounded-[10px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] max-[480px]:w-full">
        <button className="absolute right-2.5 top-2 z-[2] h-[30px] w-[30px] rounded-full border-none bg-brown text-base leading-none text-white" onClick={onClose}>&times;</button>
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
    <div className={active ? 'block' : 'hidden'}>
      <div className={ui.formSection}>
        <div className="mb-[15px] flex flex-wrap items-center justify-between gap-3">
          <h2 className={ui.h2}>{mineOnly ? 'My Tributes' : 'All Tributes'} ({subs.length})</h2>
        </div>
        {groups.length === 0 && <p className={ui.muted}>{mineOnly ? "You haven't submitted any tributes yet." : 'No tributes yet.'}</p>}
        {groups.map(([inst, items]) => (
          <div key={inst} className="mb-[22px]">
            <h3 className="mb-2.5 text-base font-bold text-ink">{inst}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 max-[480px]:grid-cols-1">
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative max-h-[90%] w-[760px] max-w-[90%] min-w-[320px] overflow-auto rounded-[10px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] max-[480px]:w-full">
        <button className="absolute right-2.5 top-2 z-[2] h-[30px] w-[30px] rounded-full border-none bg-brown text-base leading-none text-white" onClick={onClose}>&times;</button>
        <h3 className="mb-2.5 text-base font-bold text-ink">{professor.name} &mdash; {submissions.length ? `${index + 1} / ${submissions.length}` : 'No approved tributes yet'}</h3>
        {s && (
          <div className="text-center">
            <PostcardCard submission={s} />
          </div>
        )}
        {submissions.length > 1 && (
          <div className="mt-4 flex justify-between">
            <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setIndex((i) => (i - 1 + submissions.length) % submissions.length)}>&larr; Prev</button>
            <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setIndex((i) => (i + 1) % submissions.length)}>Next &rarr;</button>
          </div>
        )}
      </div>
    </div>
  );
}
