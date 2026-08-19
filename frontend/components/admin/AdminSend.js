'use client';

import { useEffect, useState } from 'react';
import { api, downloadFile } from '../../lib/api';
import { copyToClipboard } from '../../lib/clipboard';
import { typeLabel, ProfessorPreviewSlider, ui } from '../shared';

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
    <div className={active ? 'block' : 'hidden'}>
      <div className={ui.formSection}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg text-ink">Send Tributes to Professors</h2>
          <button className={`${ui.btnSecondary} ${ui.btnSmall}`} disabled={csvBusy} onClick={downloadLinksCsv}>
            {csvBusy ? 'Preparing...' : 'Download Links CSV'}
          </button>
        </div>
        <p className={ui.muted}>Review each professor&apos;s approved tributes, then share their link over email.</p>

        {linkError && <div className="mb-[18px] block rounded-md border-l-4 border-brown bg-[#f0e6cf] p-[13px_15px] text-[13px]">{linkError}</div>}

        {professors.length === 0 && <p className={ui.muted}>No professors yet.</p>}
        {professors.map((p) => {
          const profSubs = approvedSubs.filter((s) => s.profId === p.id);
          return (
            <div key={p.id} className="mb-2.5 flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-border bg-white p-3">
              <div className="flex items-center gap-2.5">
                <img className="h-12 w-10 rounded-[3px] border-2 border-brown object-cover" src={p.photo} alt={p.name} />
                <div>
                  <div><strong>{p.name}</strong></div>
                  <div className="text-xs text-muted">{p.institute} &middot; {p.designation} &middot; {profSubs.length} approved tribute(s)</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setPreviewProf(p)}>Preview</button>
                <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => copyLink(p.id)}>
                  {copiedId === p.id ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              {profSubs.length > 0 && (
                <div className="mt-2 w-full border-l-[3px] border-border pl-2">
                  {profSubs.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2.5 px-2.5 py-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded bg-[#d4c5b9] [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
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
