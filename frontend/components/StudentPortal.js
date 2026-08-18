'use client';

import { useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice } from './shared';

function StudentLogin({ institutes, onLoggedIn }) {
  const [name, setName] = useState('');
  const [institute, setInstitute] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !institute) {
      setError('Please enter your name and select your institute');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), institute })
      });
      onLoggedIn(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-container show">
      <div className="login-box">
        <img className="login-logo" src="/masai_logo.png" alt="Masai" />
        <h2>Teachers&apos; Day Postcard Portal</h2>
        <p>Student Access</p>

        <div className="form-group">
          <label>Your Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
        </div>
        <div className="form-group">
          <label>Institute *</label>
          <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
            <option value="">Select your institute</option>
            {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
        {error && <div className="alert error show">{error}</div>}
        <button className="btn" disabled={busy} onClick={submit}>Enter Portal</button>
      </div>
    </div>
  );
}

function StudentSubmit({ active, studentName, studentInstitute, professors, onSubmitted }) {
  const [selectedProfIds, setSelectedProfIds] = useState([]);
  const [type, setType] = useState('text');
  const [message, setMessage] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [fontFamily, setFontFamily] = useState('Georgia, serif');
  const [textColor, setTextColor] = useState('#2c1810');
  const [fontSize, setFontSize] = useState('26px');
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [submittedTo, setSubmittedTo] = useState([]);
  const videoInputRef = useRef(null);

  const selectedProfs = professors.filter((p) => selectedProfIds.includes(p.id));

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function toggleProf(id) {
    setSelectedProfIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onVideoChange(e) {
    const f = e.target.files[0];
    setVideoFile(f || null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (selectedProfIds.length === 0) return setAlertMsg({ type: 'error', text: 'Select at least one professor' });
    if (type === 'text' && !message.trim()) return setAlertMsg({ type: 'error', text: 'Write your message' });
    if (type === 'video' && !videoFile) return setAlertMsg({ type: 'error', text: 'Upload your video' });

    setBusy(true);
    setAlertMsg(null);
    const results = [];
    try {
      for (const profId of selectedProfIds) {
        const fd = new FormData();
        fd.append('type', type);
        fd.append('profId', profId);
        fd.append('fontFamily', fontFamily);
        fd.append('textColor', textColor);
        fd.append('fontSize', fontSize);
        if (type === 'text') fd.append('message', message.trim());
        if (type === 'video') fd.append('file', videoFile);
        const sub = await api('/api/submissions', { method: 'POST', body: fd });
        results.push(sub);
      }
      setAlertMsg({ type: 'success', text: `Tribute submitted to ${results.length} professor${results.length === 1 ? '' : 's'}! Thank you!` });
      setSubmittedTo(results);
      setMessage('');
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      setSelectedProfIds([]);
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
      {submittedTo.length > 0 && (
        <div className="form-section nested">
          <h3>Download your tribute</h3>
          {submittedTo.map((s) => (
            <div key={s.id} className="admin-actions" style={{ alignItems: 'center' }}>
              <span className="muted">To {s.profName}:</span>
              <button className="btn-secondary btn-small" onClick={() => downloadFile(`/api/submissions/${s.id}/download/pdf`)}>PDF</button>
              <button className="btn-secondary btn-small" onClick={() => downloadFile(`/api/submissions/${s.id}/download/card`)}>Card</button>
            </div>
          ))}
        </div>
      )}
      <div className="two-col">
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

          <div className="form-group">
            <label>Tribute Type *</label>
            <div className="radio-row">
              <label><input type="radio" name="submitType" checked={type === 'text'} onChange={() => setType('text')} /> Message</label>
              <label><input type="radio" name="submitType" checked={type === 'video'} onChange={() => setType('video')} /> Video</label>
            </div>
          </div>

          {type === 'text' && (
            <div className="form-group">
              <label>Message (Max 250 chars) *</label>
              <textarea value={message} maxLength={250} onChange={(e) => setMessage(e.target.value)} placeholder="Write your appreciation..." />
              <div className="char-count"><span>{message.length}</span>/250</div>
            </div>
          )}

          {type === 'video' && (
            <div className="form-group">
              <label>Upload Video *</label>
              <div className="upload-area" onClick={() => videoInputRef.current.click()}>
                <p>Click to upload</p>
                <p className="muted">MP4, WebM, MOV</p>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} />
              </div>
              <div className="muted">{videoFile ? `Selected: ${videoFile.name}` : ''}</div>
            </div>
          )}

          <div className="form-section nested">
            <h3>Customize</h3>
            <div className="form-row-3">
              <div className="form-group">
                <label>Font</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Times New Roman, serif">Times</option>
                </select>
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Font Size</label>
                <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                  <option value="20px">Small</option>
                  <option value="26px">Medium</option>
                  <option value="32px">Large</option>
                  <option value="38px">Extra Large</option>
                </select>
              </div>
            </div>
          </div>

          <button className="btn btn-full" disabled={busy} onClick={submit}>{busy ? 'Submitting...' : 'Submit Tribute'}</button>
        </div>

        <div>
          <h2>Live Preview {selectedProfs.length > 1 ? `(${selectedProfs.length} professors)` : ''}</h2>
          {selectedProfs.length === 0 && (
            <div className="postcard-frame" style={{ fontFamily }}>
              <div className="postcard-border">
                <div className="postcard-left"><div className="muted center">Select a professor to preview your tribute</div></div>
                <div className="postcard-divider" />
                <div className="postcard-right" />
              </div>
            </div>
          )}
          {selectedProfs.map((prof) => (
            <div key={prof.id} style={{ marginBottom: 20 }}>
              {selectedProfs.length > 1 && <div className="muted" style={{ marginBottom: 6 }}>To: <strong>{prof.name}</strong></div>}
              <div className="postcard-frame" style={{ fontFamily }}>
                <div className="postcard-border">
                  <div className="postcard-left">
                    {type === 'text' && (
                      <div className="quote" style={{ color: textColor, fontSize }}>{message || 'Your message will appear here'}</div>
                    )}
                    {type === 'video' && (videoUrl ? <video controls src={videoUrl} /> : <div className="muted center">Video will show here</div>)}
                  </div>
                  <div className="postcard-divider" />
                  <div className="postcard-right">
                    <div className="postcard-prof">
                      <div className="postcard-prof-img"><img src={prof.photo} alt={prof.name} /></div>
                      <div className="postcard-label">To</div>
                      <div className="postcard-prof-name" style={{ color: textColor }}>{prof.name}</div>
                    </div>
                    <div>
                      <div className="postcard-hr" />
                      <div className="postcard-from">
                        <div className="postcard-label">From</div>
                        <div className="postcard-student-name" style={{ color: textColor }}>{studentName}</div>
                        <div className="postcard-student-institute">{studentInstitute}</div>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentPortal() {
  const { session, setSession, logout } = useSession();
  const institutes = useInstitutes();
  const [professors, setProfessors] = useState([]);
  const [activeTab, setActiveTab] = useState('student');

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'student') return;
    loadProfessors();
    const interval = setInterval(loadProfessors, 5000);
    return () => clearInterval(interval);
  }, [session]);

  function loadProfessors() {
    api('/api/professors').then(setProfessors).catch(() => {});
  }

  if (session === 'loading') return null;
  if (session === 'anon') {
    return <StudentLogin institutes={institutes} onLoggedIn={setSession} />;
  }
  if (session.role !== 'student') {
    return <WrongRoleNotice role={session.role} expected="students" onLogout={logout} />;
  }

  return (
    <div className="container">
      <div className="top-bar">
        <div className="brand-row">
          <img src="/masai_logo.png" alt="Masai" className="brand-logo" />
          <h1>Teachers&apos; Day Postcard Portal</h1>
        </div>
        <button className="btn logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>Submit Tribute</button>
        <button className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Gallery</button>
      </div>

      <StudentSubmit
        active={activeTab === 'student'}
        studentName={session.name}
        studentInstitute={session.institute}
        professors={professors}
        onSubmitted={() => {}}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={false} />
    </div>
  );
}
