'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { addMySubmissionIds } from '../../lib/mySubmissions';
import { FIXED_STYLE, nameFontSize, ui } from '../shared';
import TributeInline from './TributeInline';

const EMPTY_TRIBUTE = { mode: null, message: '', videoFile: null, videoUrl: null };

// Keep in sync with the multer limit in backend/src/routes/submissions.js —
// this is just an early, friendly rejection so a student doesn't wait
// through a huge upload only to have the server reject it at the end.
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export default function StudentSubmit({ active, studentName, professors, onSubmitted }) {
  const [selectedProfIds, setSelectedProfIds] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tributes, setTributes] = useState({});
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const videoInputRef = useRef(null);
  const pendingVideoProfId = useRef(null);

  const selectedProfs = professors.filter((p) => selectedProfIds.includes(p.id));
  const safePreviewIndex = Math.min(previewIndex, Math.max(selectedProfs.length - 1, 0));
  const currentProf = selectedProfs[safePreviewIndex];

  function getTribute(profId) {
    return tributes[profId] || EMPTY_TRIBUTE;
  }

  function updateTribute(profId, patch) {
    setTributes((prev) => ({ ...prev, [profId]: { ...(prev[profId] || EMPTY_TRIBUTE), ...patch } }));
  }

  function clearTribute(profId) {
    const t = getTribute(profId);
    if (t.videoUrl) URL.revokeObjectURL(t.videoUrl);
    setTributes((prev) => ({ ...prev, [profId]: EMPTY_TRIBUTE }));
  }

  function toggleProf(id) {
    const wasSelected = selectedProfIds.includes(id);
    const newSelected = wasSelected ? selectedProfIds.filter((x) => x !== id) : [...selectedProfIds, id];
    setSelectedProfIds(newSelected);
    if (wasSelected) {
      clearTribute(id);
      setPreviewIndex((i) => Math.min(i, Math.max(newSelected.length - 1, 0)));
    } else {
      // jump the slider to the newly selected professor's card
      setPreviewIndex(newSelected.length - 1);
    }
  }

  function triggerVideoPick(profId) {
    pendingVideoProfId.current = profId;
    videoInputRef.current.click();
  }

  function onVideoChange(e) {
    const f = e.target.files[0];
    const profId = pendingVideoProfId.current;
    e.target.value = '';
    if (!f || !profId) return;
    if (f.size > MAX_VIDEO_BYTES) {
      setAlertMsg({ type: 'error', text: `That video is ${(f.size / (1024 * 1024)).toFixed(0)}MB — the limit is 200MB. Pick a smaller file.` });
      return;
    }
    const prevUrl = getTribute(profId).videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    updateTribute(profId, { mode: 'video', videoFile: f, videoUrl: URL.createObjectURL(f) });
  }

  async function submit() {
    if (selectedProfIds.length === 0) return setAlertMsg({ type: 'error', text: 'Select at least one professor' });

    for (const profId of selectedProfIds) {
      const t = getTribute(profId);
      const incomplete = !t.mode || (t.mode === 'text' && !t.message.trim()) || (t.mode === 'video' && !t.videoFile);
      if (incomplete) {
        const prof = professors.find((p) => p.id === profId);
        return setAlertMsg({ type: 'error', text: `Add a message or video for ${prof ? prof.name : 'the selected professor'}` });
      }
    }

    setBusy(true);
    setAlertMsg(null);
    const results = [];
    try {
      for (const profId of selectedProfIds) {
        const t = getTribute(profId);
        const fd = new FormData();
        fd.append('profId', profId);
        if (t.mode === 'text') fd.append('message', t.message.trim());
        if (t.mode === 'video') fd.append('file', t.videoFile);
        const sub = await api('/api/submissions', { method: 'POST', body: fd });
        results.push(sub);
      }
      setAlertMsg({ type: 'success', text: `Tribute submitted to ${results.length} professor${results.length === 1 ? '' : 's'}! Thank you!` });
      addMySubmissionIds(results.map((s) => s.id));
      selectedProfIds.forEach((id) => { const t = getTribute(id); if (t.videoUrl) URL.revokeObjectURL(t.videoUrl); });
      setTributes({});
      setSelectedProfIds([]);
      setPreviewIndex(0);
      onSubmitted();
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={active ? 'block' : 'hidden'}>
      {alert && <div className={`${ui.alert} ${alert.type === 'success' ? ui.alertSuccess : ui.alertError}`}>{alert.text}</div>}
      <div className="flex flex-col gap-[30px]">
        <div className={ui.formSection}>
          <h2 className={ui.h2}>Create Your Tribute</h2>

          <div className={ui.formGroup}>
            <label className={ui.label}>Select Professor(s) * <span className={ui.muted}>({professors.length})</span></label>
            <div className={ui.professorGrid}>
              {professors.length === 0 && <p className={ui.muted}>No professors yet for your institute.</p>}
              {professors.map((p) => (
                <div key={p.id} className={`${ui.profCard} ${selectedProfIds.includes(p.id) ? ui.profCardSelected : ''}`} onClick={() => toggleProf(p.id)}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p style={{ color: '#8b6f47' }}>{p.designation}</p>
                </div>
              ))}
            </div>
          </div>

          <p className={ui.muted}>Click into each postcard&apos;s preview below to type a message or upload a video for that professor.</p>

          <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} style={{ display: 'none' }} />

          <button className={`${ui.btn} ${ui.btnFull}`} disabled={busy} onClick={submit}>{busy ? 'Submitting...' : 'Submit Tribute'}</button>
        </div>

        <div>
          <h2 className={ui.h2}>Live Preview {selectedProfs.length > 1 ? `(${selectedProfs.length} professors)` : ''}</h2>
          {selectedProfs.length === 0 && (
            <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
              <div className="postcard-border">
                <div className="postcard-left"><div className="w-full text-center text-xs text-muted">Select a professor to preview your tribute</div></div>
                <div className="postcard-divider" />
                <div className="postcard-right" />
              </div>
            </div>
          )}
          {currentProf && (
            <>
              <div className={`${ui.muted} mb-1.5`}>To: <strong>{currentProf.name}</strong></div>
              <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
                <div className="postcard-border">
                  <div className="postcard-left">
                    <TributeInline
                      tribute={getTribute(currentProf.id)}
                      onPickText={() => updateTribute(currentProf.id, { mode: 'text' })}
                      onPickVideo={() => triggerVideoPick(currentProf.id)}
                      onMessageChange={(v) => updateTribute(currentProf.id, { message: v })}
                      onClear={() => clearTribute(currentProf.id)}
                    />
                  </div>
                  <div className="postcard-divider" />
                  <div className="postcard-right">
                    <div className="postcard-prof">
                      <div className="postcard-prof-img"><img src={currentProf.photo} alt={currentProf.name} /></div>
                      <div className="postcard-label">To</div>
                      <div className="postcard-prof-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(currentProf.name, 17) }}>{currentProf.name}</div>
                    </div>
                    <div>
                      <div className="postcard-hr" />
                      <div className="postcard-from">
                        <div className="postcard-label">From</div>
                        <div className="postcard-student-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(studentName, 15) }}>{studentName}</div>
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
              {selectedProfs.length > 1 && (
                <div className="mt-3.5 flex items-center justify-center gap-[18px]">
                  <button type="button" className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setPreviewIndex((i) => (i - 1 + selectedProfs.length) % selectedProfs.length)}>&larr; Prev</button>
                  <span className={ui.muted}>{safePreviewIndex + 1} / {selectedProfs.length}</span>
                  <button type="button" className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setPreviewIndex((i) => (i + 1) % selectedProfs.length)}>Next &rarr;</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
