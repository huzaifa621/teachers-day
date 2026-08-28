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

export default function StudentSubmit({ active, studentName, facultyList, facultyLoading, facultyError, onRetryFaculty, onSubmitted }) {
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tributes, setTributes] = useState({});
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  // null when no upload is in flight, otherwise 0-100 for the current video.
  const [uploadPct, setUploadPct] = useState(null);
  const videoInputRef = useRef(null);
  const pendingVideoFacultyId = useRef(null);

  const selectedFaculty = facultyList.filter((p) => selectedFacultyIds.includes(p.id));
  const safePreviewIndex = Math.min(previewIndex, Math.max(selectedFaculty.length - 1, 0));
  const currentFaculty = selectedFaculty[safePreviewIndex];

  function getTribute(facultyId) {
    return tributes[facultyId] || EMPTY_TRIBUTE;
  }

  function updateTribute(facultyId, patch) {
    setTributes((prev) => ({ ...prev, [facultyId]: { ...(prev[facultyId] || EMPTY_TRIBUTE), ...patch } }));
  }

  function clearTribute(facultyId) {
    const t = getTribute(facultyId);
    if (t.videoUrl) URL.revokeObjectURL(t.videoUrl);
    setTributes((prev) => ({ ...prev, [facultyId]: EMPTY_TRIBUTE }));
  }

  function toggleFaculty(id) {
    const wasSelected = selectedFacultyIds.includes(id);
    const newSelected = wasSelected ? selectedFacultyIds.filter((x) => x !== id) : [...selectedFacultyIds, id];
    setSelectedFacultyIds(newSelected);
    if (wasSelected) {
      clearTribute(id);
      setPreviewIndex((i) => Math.min(i, Math.max(newSelected.length - 1, 0)));
    } else {
      // jump the slider to the newly selected faculty's card
      setPreviewIndex(newSelected.length - 1);
    }
  }

  function triggerVideoPick(facultyId) {
    pendingVideoFacultyId.current = facultyId;
    videoInputRef.current.click();
  }

  function onVideoChange(e) {
    const f = e.target.files[0];
    const facultyId = pendingVideoFacultyId.current;
    e.target.value = '';
    if (!f || !facultyId) return;
    if (f.size > MAX_VIDEO_BYTES) {
      setAlertMsg({ type: 'error', text: `That video is ${(f.size / (1024 * 1024)).toFixed(0)}MB — the limit is 200MB. Pick a smaller file.` });
      return;
    }
    const prevUrl = getTribute(facultyId).videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    updateTribute(facultyId, { mode: 'video', videoFile: f, videoUrl: URL.createObjectURL(f) });
  }

  async function submit() {
    if (selectedFacultyIds.length === 0) return setAlertMsg({ type: 'error', text: 'Select at least one faculty' });

    for (const facultyId of selectedFacultyIds) {
      const t = getTribute(facultyId);
      const incomplete = !t.mode || (t.mode === 'text' && !t.message.trim()) || (t.mode === 'video' && !t.videoFile);
      if (incomplete) {
        const member = facultyList.find((p) => p.id === facultyId);
        return setAlertMsg({ type: 'error', text: `Add a message or video for ${member ? member.name : 'the selected faculty'}` });
      }
    }

    setBusy(true);
    setAlertMsg(null);
    // Submitted one faculty at a time, so a failure partway through a
    // multi-faculty batch doesn't lose track of the ones that already
    // went through — those still count as "my tributes" even if a later
    // one in the same batch fails.
    const results = [];
    let failedFaculty = null;
    let failureMessage = null;
    for (const facultyId of selectedFacultyIds) {
      const t = getTribute(facultyId);
      const payload = { facultyId, deviceId: getDeviceId() || undefined };
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
        failedFaculty = facultyList.find((p) => p.id === facultyId);
        failureMessage = e.message;
        break;
      }
    }

    if (results.length > 0) addMySubmissionIds(results.map((s) => s.id));

    if (failedFaculty) {
      const successNote = results.length > 0 ? ` ${results.length} of ${selectedFacultyIds.length} went through — check My Tributes.` : '';
      setAlertMsg({ type: 'error', text: `Couldn't send the tribute to ${failedFaculty.name}: ${failureMessage}.${successNote}` });
    } else {
      setAlertMsg({ type: 'success', text: `Tribute submitted to ${results.length} faculty${results.length === 1 ? '' : 's'}! Thank you!` });
      selectedFacultyIds.forEach((id) => { const t = getTribute(id); if (t.videoUrl) URL.revokeObjectURL(t.videoUrl); });
      setTributes({});
      setSelectedFacultyIds([]);
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
            <label>Select Faculty(s) * <span className="muted">({facultyList.length})</span></label>
            <div className="faculty-grid">
              {facultyLoading && facultyList.length === 0 && <Loader text="Loading faculty…" />}
              {!facultyLoading && facultyError && facultyList.length === 0 && <ErrorState message={facultyError} onRetry={onRetryFaculty} />}
              {!facultyLoading && !facultyError && facultyList.length === 0 && <p className="muted">No faculty yet for your institute.</p>}
              {facultyList.map((p) => (
                <div key={p.id} className={`faculty-card ${selectedFacultyIds.includes(p.id) ? 'selected' : ''}`} onClick={() => toggleFaculty(p.id)}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                </div>
              ))}
            </div>
          </div>

          <p className="muted">Click into each postcard&apos;s preview below to type a message or upload a video for that faculty.</p>

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
          <h2>Live Preview {selectedFaculty.length > 1 ? `(${selectedFaculty.length} faculty)` : ''}</h2>
          {selectedFaculty.length === 0 && (
            <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
              <div className="postcard-border">
                <div className="postcard-left"><div className="muted center">Select a faculty to preview your tribute</div></div>
                <div className="postcard-divider" />
                <div className="postcard-right" />
              </div>
            </div>
          )}
          {currentFaculty && (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>To: <strong>{currentFaculty.name}</strong></div>
              <div className="postcard-frame" style={{ fontFamily: FIXED_STYLE.fontFamily }}>
                <div className="postcard-border">
                  <div className="postcard-left">
                    <TributeInline
                      tribute={getTribute(currentFaculty.id)}
                      onPickText={() => updateTribute(currentFaculty.id, { mode: 'text' })}
                      onPickVideo={() => triggerVideoPick(currentFaculty.id)}
                      onMessageChange={(v) => updateTribute(currentFaculty.id, { message: v })}
                      onClear={() => clearTribute(currentFaculty.id)}
                    />
                  </div>
                  <div className="postcard-divider" />
                  <div className="postcard-right">
                    <div className="postcard-faculty">
                      <div className="postcard-faculty-img"><img src={currentFaculty.photo} alt={currentFaculty.name} /></div>
                      <div className="postcard-label">To</div>
                      <div className="postcard-faculty-name" style={{ color: FIXED_STYLE.textColor, fontSize: nameFontSize(currentFaculty.name, 17) }}>{currentFaculty.name}</div>
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
              {selectedFaculty.length > 1 && (
                <div className="slider-controls-centered">
                  <button type="button" className="btn-secondary btn-small" onClick={() => setPreviewIndex((i) => (i - 1 + selectedFaculty.length) % selectedFaculty.length)}>&larr; Prev</button>
                  <span className="muted">{safePreviewIndex + 1} / {selectedFaculty.length}</span>
                  <button type="button" className="btn-secondary btn-small" onClick={() => setPreviewIndex((i) => (i + 1) % selectedFaculty.length)}>Next &rarr;</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
