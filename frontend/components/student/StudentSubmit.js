'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { uploadDirect } from '../../lib/upload';
import { addMySubmissionIds } from '../../lib/mySubmissions';
import { getDeviceId } from '../../lib/deviceId';
import { FIXED_STYLE, nameFontSize, Loader, ErrorState } from '../shared';
import TributeInline from './TributeInline';

const EMPTY_TRIBUTE = { mode: null, message: '', videoFile: null, videoUrl: null };

// Keep in sync with the multer limit in backend/src/routes/submissions.js —
// this is just an early, friendly rejection so a student doesn't wait
// through a huge upload only to have the server reject it at the end.
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export default function StudentSubmit({ active, studentName, professors, profsLoading, profsError, onRetryProfessors, onSubmitted }) {
  const [selectedProfIds, setSelectedProfIds] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tributes, setTributes] = useState({});
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  // null when no upload is in flight, otherwise 0-100 for the current video.
  const [uploadPct, setUploadPct] = useState(null);
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
    // Submitted one professor at a time, so a failure partway through a
    // multi-professor batch doesn't lose track of the ones that already
    // went through — those still count as "my tributes" even if a later
    // one in the same batch fails.
    const results = [];
    let failedProf = null;
    let failureMessage = null;
    for (const profId of selectedProfIds) {
      const t = getTribute(profId);
      const payload = { profId, deviceId: getDeviceId() || undefined };
      if (t.mode === 'text') payload.message = t.message.trim();
      try {
        // The video goes straight from the browser to S3; only the resulting
        // key travels through our API (see lib/upload.js).
        if (t.mode === 'video') {
          setUploadPct(0);
          const { key, token } = await uploadDirect('video', t.videoFile, setUploadPct);
          payload.fileKey = key;
          payload.fileToken = token;
          payload.fileName = t.videoFile.name;
          setUploadPct(null);
        }
        const sub = await api('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        results.push(sub);
      } catch (e) {
        setUploadPct(null);
        failedProf = professors.find((p) => p.id === profId);
        failureMessage = e.message;
        break;
      }
    }

    if (results.length > 0) addMySubmissionIds(results.map((s) => s.id));

    if (failedProf) {
      const successNote = results.length > 0 ? ` ${results.length} of ${selectedProfIds.length} went through — check My Tributes.` : '';
      setAlertMsg({ type: 'error', text: `Couldn't send the tribute to ${failedProf.name}: ${failureMessage}.${successNote}` });
    } else {
      setAlertMsg({ type: 'success', text: `Tribute submitted to ${results.length} professor${results.length === 1 ? '' : 's'}! Thank you!` });
      selectedProfIds.forEach((id) => { const t = getTribute(id); if (t.videoUrl) URL.revokeObjectURL(t.videoUrl); });
      setTributes({});
      setSelectedProfIds([]);
      setPreviewIndex(0);
      onSubmitted();
    }
    setBusy(false);
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
              {profsLoading && professors.length === 0 && <Loader text="Loading professors…" />}
              {!profsLoading && profsError && professors.length === 0 && <ErrorState message={profsError} onRetry={onRetryProfessors} />}
              {!profsLoading && !profsError && professors.length === 0 && <p className="muted">No professors yet for your institute.</p>}
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
          {busy && (
            <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {uploadPct === null
                ? 'This can take a minute for a video tribute — please don\u2019t close this tab.'
                : `Uploading video… ${uploadPct}% — please don\u2019t close this tab.`}
            </p>
          )}
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
