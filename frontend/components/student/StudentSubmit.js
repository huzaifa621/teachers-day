'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { addMySubmissionIds } from '../../lib/mySubmissions';
import { FIXED_STYLE, nameFontSize } from '../shared';
import TributeInline from './TributeInline';

const EMPTY_TRIBUTE = { mode: null, message: '', videoFile: null, videoUrl: null };

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
    <div className={`tab-content ${active ? 'active' : ''}`}>
      {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
      <div className="stacked-col">
        <div className="form-section">
          <h2>Create Your Tribute</h2>

          <div className="form-group">
            <label>Select Professor(s) * <span className="muted">({professors.length})</span></label>
            <div className="professor-grid">
              {professors.length === 0 && <p className="muted">No professors yet for your institute.</p>}
              {professors.map((p) => (
                <div key={p.id} className={`prof-card ${selectedProfIds.includes(p.id) ? 'selected' : ''}`} onClick={() => toggleProf(p.id)}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p style={{ color: '#8b6f47' }}>{p.designation}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="muted">Click into each postcard&apos;s preview below to type a message or upload a video for that professor.</p>

          <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} style={{ display: 'none' }} />

          <button className="btn btn-full" disabled={busy} onClick={submit}>{busy ? 'Submitting...' : 'Submit Tribute'}</button>
        </div>

        <div>
          <h2>Live Preview {selectedProfs.length > 1 ? `(${selectedProfs.length} professors)` : ''}</h2>
          {selectedProfs.length === 0 && (
            <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
              <div className="postcard-border">
                <div className="postcard-left"><div className="muted center">Select a professor to preview your tribute</div></div>
                <div className="postcard-divider" />
                <div className="postcard-right" />
              </div>
            </div>
          )}
          {currentProf && (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>To: <strong>{currentProf.name}</strong></div>
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
                <div className="slider-controls-centered">
                  <button type="button" className="btn-secondary btn-small" onClick={() => setPreviewIndex((i) => (i - 1 + selectedProfs.length) % selectedProfs.length)}>&larr; Prev</button>
                  <span className="muted">{safePreviewIndex + 1} / {selectedProfs.length}</span>
                  <button type="button" className="btn-secondary btn-small" onClick={() => setPreviewIndex((i) => (i + 1) % selectedProfs.length)}>Next &rarr;</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
