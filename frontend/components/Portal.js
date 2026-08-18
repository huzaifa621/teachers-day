'use client';

import { useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../lib/api';

function typeLabel(t) { return t === 'text' ? 'Message' : t === 'video' ? 'Video' : 'PDF'; }

// ---------- LOGIN ----------
function Login({ onLoggedIn }) {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [institute, setInstitute] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitStudent() {
    if (!name.trim() || !institute.trim()) {
      setError('Please enter your name and institute');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), institute: institute.trim() })
      });
      onLoggedIn({ role: 'student', name: name.trim(), institute: institute.trim() });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAdmin() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      onLoggedIn({ role: 'admin' });
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
        <p>Secure Access</p>

        <div className="role-selector">
          <button className={`role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>Student</button>
          <button className={`role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</button>
        </div>

        {role === 'student' ? (
          <div>
            <div className="form-group">
              <label>Your Full Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="form-group">
              <label>Institute *</label>
              <input type="text" value={institute} onChange={(e) => setInstitute(e.target.value)} placeholder="Enter your institute" />
            </div>
            {error && <div className="alert error show">{error}</div>}
            <button className="btn" disabled={busy} onClick={submitStudent}>Enter Portal</button>
          </div>
        ) : (
          <div>
            <div className="form-group">
              <label>Admin Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" />
            </div>
            {error && <div className="alert error show">{error}</div>}
            <button className="btn" disabled={busy} onClick={submitAdmin}>Login as Admin</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- SUBMISSION CARD (shared by Gallery + Send-to-profs) ----------
function SubmissionCard({ s, onView }) {
  const [busy, setBusy] = useState(null);

  let thumb;
  if (s.type === 'text') thumb = <div style={{ fontSize: 36 }}>&#128221;</div>;
  else if (s.type === 'video') thumb = <video muted><source src={s.fileUrl} /></video>;
  else thumb = <div style={{ fontSize: 36 }}>&#128196;</div>;

  return (
    <div className="gallery-card">
      <div className="gallery-thumbnail" onClick={() => onView(s)}>{thumb}</div>
      <div className="gallery-info">
        <div className="gallery-header"><span className="gallery-type">{typeLabel(s.type)}</span></div>
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
      </div>
    </div>
  );
}

function MediaModal({ submission, onClose }) {
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

// ---------- STUDENT: SUBMIT TRIBUTE ----------
function StudentSubmit({ active, studentName, studentInstitute, professors, onSubmitted }) {
  const [search, setSearch] = useState('');
  const [selectedProfId, setSelectedProfId] = useState(null);
  const [type, setType] = useState('text');
  const [message, setMessage] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [fontFamily, setFontFamily] = useState('Georgia, serif');
  const [textColor, setTextColor] = useState('#2c1810');
  const [fontSize, setFontSize] = useState('26px');
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const videoInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const filtered = professors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.institute.toLowerCase().includes(search.toLowerCase())
  );
  const selectedProf = professors.find((p) => p.id === selectedProfId);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function onVideoChange(e) {
    const f = e.target.files[0];
    setVideoFile(f || null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!selectedProfId) return setAlertMsg({ type: 'error', text: 'Select a professor' });
    if (type === 'text' && !message.trim()) return setAlertMsg({ type: 'error', text: 'Write your message' });
    if (type === 'video' && !videoFile) return setAlertMsg({ type: 'error', text: 'Upload your video' });
    if (type === 'pdf' && !pdfFile) return setAlertMsg({ type: 'error', text: 'Upload your PDF' });

    const fd = new FormData();
    fd.append('type', type);
    fd.append('profId', selectedProfId);
    fd.append('fontFamily', fontFamily);
    fd.append('textColor', textColor);
    fd.append('fontSize', fontSize);
    if (type === 'text') fd.append('message', message.trim());
    if (type === 'video') fd.append('file', videoFile);
    if (type === 'pdf') fd.append('file', pdfFile);

    setBusy(true);
    try {
      const sub = await api('/api/submissions', { method: 'POST', body: fd });
      setAlertMsg({ type: 'success', text: 'Tribute submitted! Thank you! Find it any time under the Gallery tab.' });
      setMessage('');
      setVideoFile(null);
      setPdfFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      setSelectedProfId(null);
      onSubmitted(sub);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
      <div className="two-col">
        <div className="form-section">
          <h2>Create Your Tribute</h2>

          <div className="form-group">
            <label>Select Professor * <span className="muted">({professors.length})</span></label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search professor name..." />
            <div className="professor-grid">
              {filtered.length === 0 && <p className="muted">No professors yet.</p>}
              {filtered.map((p) => (
                <div key={p.id} className={`prof-card ${p.id === selectedProfId ? 'selected' : ''}`} onClick={() => setSelectedProfId(p.id)}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p style={{ color: '#8b6f47' }}>{p.institute}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tribute Type *</label>
            <div className="radio-row">
              <label><input type="radio" name="submitType" checked={type === 'text'} onChange={() => setType('text')} /> Message</label>
              <label><input type="radio" name="submitType" checked={type === 'video'} onChange={() => setType('video')} /> Video</label>
              <label><input type="radio" name="submitType" checked={type === 'pdf'} onChange={() => setType('pdf')} /> PDF</label>
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

          {type === 'pdf' && (
            <div className="form-group">
              <label>Upload PDF *</label>
              <div className="upload-area" onClick={() => pdfInputRef.current.click()}>
                <p>Click to upload PDF</p>
                <p className="muted">Max 20MB</p>
                <input ref={pdfInputRef} type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0] || null)} />
              </div>
              <div className="muted">{pdfFile ? `Selected: ${pdfFile.name}` : ''}</div>
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
          <h2>Live Preview</h2>
          <div className="postcard-frame" style={{ fontFamily }}>
            <div className="postcard-border">
              <div className="postcard-left">
                {type === 'text' && (
                  <div className="quote" style={{ color: textColor, fontSize }}>{message || 'Your message will appear here'}</div>
                )}
                {type === 'video' && (videoUrl ? <video controls src={videoUrl} /> : <div className="muted center">Video will show here</div>)}
                {type === 'pdf' && (pdfFile
                  ? <div className="muted center">PDF selected:<br /><strong>{pdfFile.name}</strong></div>
                  : <div className="muted center">PDF will show here</div>)}
              </div>
              <div className="postcard-divider" />
              <div className="postcard-right">
                <div className="postcard-prof">
                  <div className="postcard-prof-img">
                    {selectedProf ? <img src={selectedProf.photo} alt={selectedProf.name} /> : <span className="muted tiny">Prof Photo</span>}
                  </div>
                  <div className="postcard-label">To</div>
                  <div className="postcard-prof-name" style={{ color: textColor }}>{selectedProf?.name || 'Prof Name'}</div>
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
      </div>
    </div>
  );
}

// ---------- GALLERY ----------
function Gallery({ active, onView }) {
  const [subs, setSubs] = useState([]);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active || loaded) return;
    api('/api/submissions').then((list) => { setSubs(list); setLoaded(true); }).catch(() => setLoaded(true));
  }, [active, loaded]);

  const filtered = subs.filter((s) =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.profName.toLowerCase().includes(search.toLowerCase()) ||
    (s.message || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <div className="top-bar" style={{ marginBottom: 15 }}>
          <h2 style={{ margin: 0 }}>All Tributes ({filtered.length})</h2>
        </div>
        <input type="text" className="search-input" placeholder="Search tributes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="gallery-grid">
          {filtered.length === 0 && <p className="muted">No tributes yet.</p>}
          {filtered.map((s) => <SubmissionCard key={s.id} s={s} onView={onView} />)}
        </div>
      </div>
    </div>
  );
}

// ---------- ADMIN: DASHBOARD ----------
function AdminHome({ active }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!active) return;
    api('/api/stats').then(setStats).catch(() => {});
  }, [active]);

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-card"><h3>{stats?.institutes ?? 0}</h3><p>Institutes</p></div>
          <div className="stat-card"><h3>{stats?.professors ?? 0}</h3><p>Professors</p></div>
          <div className="stat-card"><h3>{stats?.submissions ?? 0}</h3><p>Tributes</p></div>
          <div className="stat-card"><h3>{stats?.students ?? 0}</h3><p>Students</p></div>
          <div className="stat-card"><h3>{stats ? `${stats.storageMB} MB` : '0 MB'}</h3><p>Storage Used</p></div>
        </div>
        <div className="admin-actions">
          <button className="btn-secondary btn-small" onClick={() => downloadFile('/api/admin/export.json')}>Export JSON</button>
          <button className="btn-secondary btn-small" onClick={() => downloadFile('/api/admin/export.csv')}>Export CSV</button>
        </div>
      </div>
    </div>
  );
}

// ---------- ADMIN: ADD PROFESSOR ----------
function AdminAddProf({ active, onAdded }) {
  const [institute, setInstitute] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  function onPhotoChange(e) {
    const f = e.target.files[0];
    setPhoto(f || null);
    if (!f) { setPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target.result);
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (!institute.trim() || !name.trim() || !dept.trim() || !photo) {
      return setAlertMsg({ type: 'error', text: 'Fill all required fields' });
    }
    const fd = new FormData();
    fd.append('institute', institute.trim());
    fd.append('instituteCode', instituteCode.trim());
    fd.append('name', name.trim());
    fd.append('dept', dept.trim());
    fd.append('email', email.trim());
    fd.append('photo', photo);

    setBusy(true);
    try {
      const prof = await api('/api/professors', { method: 'POST', body: fd });
      setInstitute(''); setInstituteCode(''); setName(''); setDept(''); setEmail('');
      setPhoto(null); setPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setAlertMsg({ type: 'success', text: `${prof.name} added!` });
      onAdded(prof);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Add Professor</h2>
        {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
        <div className="form-row">
          <div className="form-group"><label>Institute Name *</label><input type="text" value={institute} onChange={(e) => setInstitute(e.target.value)} placeholder="e.g., MIT, IIT" /></div>
          <div className="form-group"><label>Institute Code</label><input type="text" value={instituteCode} onChange={(e) => setInstituteCode(e.target.value)} placeholder="e.g., IIT-001" /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label>Professor Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div className="form-group"><label>Department *</label><input type="text" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Department" /></div>
          <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></div>
        </div>
        <div className="form-group">
          <label>Upload Photo *</label>
          <div className="upload-area" onClick={() => photoInputRef.current.click()}>
            <p>Click to upload</p>
            <p className="muted">JPG, PNG</p>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} />
          </div>
          {preview && <div><img src={preview} style={{ maxWidth: 100, border: '2px solid #8b6f47', borderRadius: 6, marginTop: 10 }} /></div>}
        </div>
        <button className="btn btn-full" disabled={busy} onClick={submit}>Add Professor</button>
      </div>
    </div>
  );
}

// ---------- ADMIN: DIRECTORY ----------
function AdminDirectory({ active, professors }) {
  const byInstitute = {};
  professors.forEach((p) => { (byInstitute[p.institute] ||= []).push(p); });
  const entries = Object.entries(byInstitute);

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Professor Directory</h2>
        {entries.length === 0 && <p className="muted">No professors yet.</p>}
        {entries.map(([inst, profs]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="professor-grid" style={{ maxHeight: 'none' }}>
              {profs.map((p) => (
                <div key={p.id} className="prof-card" style={{ cursor: 'default' }}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p>{p.dept}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- ADMIN: SEND TO PROFS ----------
function AdminSend({ active, professors, onView }) {
  const [subs, setSubs] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!active) return;
    api('/api/submissions').then(setSubs).catch(() => {});
  }, [active]);

  const byInstitute = {};
  professors.forEach((p) => { (byInstitute[p.institute] ||= []).push(p); });
  const entries = Object.entries(byInstitute);

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Send Tributes to Professors</h2>
        <p className="muted">
          Download each professor&apos;s message tributes as one combined PDF, and download each video or PDF
          tribute individually, then share them over WhatsApp or email.
        </p>
        {entries.length === 0 && <p className="muted">No professors yet.</p>}
        {entries.map(([inst, profs]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            {profs.map((p) => {
              const profSubs = subs.filter((s) => s.profId === p.id);
              const textCount = profSubs.filter((s) => s.type === 'text').length;
              const mediaSubs = profSubs.filter((s) => s.type !== 'text');
              return (
                <div key={p.id} className="prof-send-row">
                  <div className="who">
                    <img src={p.photo} alt={p.name} />
                    <div>
                      <div><strong>{p.name}</strong></div>
                      <div className="meta">{p.dept} &middot; {profSubs.length} tribute(s)</div>
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      className="btn-secondary btn-small"
                      disabled={textCount === 0 || busyId === p.id}
                      onClick={() => { setBusyId(p.id); downloadFile(`/api/professors/${p.id}/download/pdf`).finally(() => setBusyId(null)); }}
                    >
                      Combined PDF ({textCount} message{textCount === 1 ? '' : 's'})
                    </button>
                  </div>
                  {mediaSubs.length > 0 && (
                    <div className="media-list" style={{ width: '100%' }}>
                      {mediaSubs.map((s) => (
                        <div key={s.id} className="media-row">
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="media-row-thumb" onClick={() => onView(s)}>
                              {s.type === 'video' ? <video muted><source src={s.fileUrl} /></video> : <>&#128196;</>}
                            </span>
                            {typeLabel(s.type)} from <strong>{s.studentName}</strong>
                          </span>
                          <span>
                            <button className="gallery-btn alt" onClick={() => downloadFile(`/api/submissions/${s.id}/download/pdf`)}>PDF</button>
                            <button className="gallery-btn alt" onClick={() => downloadFile(`/api/submissions/${s.id}/download/card`)}>{s.type === 'video' ? 'Video Card' : 'Card'}</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- ADMIN: SETTINGS ----------
function AdminSettings({ active, onCleared }) {
  async function clearAll() {
    if (!confirm('This clears all professors and tributes from the database. Uploaded files stay in storage. Continue?')) return;
    await api('/api/admin/clear-all', { method: 'DELETE' });
    onCleared();
    alert('All data cleared.');
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Settings</h2>
        <div className="settings-box">
          <h3>Data Management</h3>
          <div className="admin-actions">
            <button className="btn-secondary btn-small" onClick={() => downloadFile('/api/admin/export.json')}>JSON Export</button>
            <button className="btn-secondary btn-small" onClick={() => downloadFile('/api/admin/export.csv')}>CSV Export</button>
            <button className="btn-secondary btn-small" onClick={() => downloadFile('/api/admin/backup.json')}>Backup</button>
            <button className="btn-secondary btn-small danger" onClick={clearAll}>Clear All</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- ROOT PORTAL ----------
export default function Portal() {
  const [session, setSession] = useState(null); // { role, name, institute } | null | 'loading'
  const [professors, setProfessors] = useState([]);
  const [activeTab, setActiveTab] = useState('student');
  const [modalSubmission, setModalSubmission] = useState(null);

  useEffect(() => {
    api('/api/auth/me').then((data) => {
      if (data.role) {
        setSession({ role: data.role, name: data.name, institute: data.institute });
        setActiveTab(data.role === 'admin' ? 'admin-home' : 'student');
      } else {
        setSession(false);
      }
    }).catch(() => setSession(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    loadProfessors();
    // Live-refresh the professor picker while a student is composing (mirrors admin additions).
    const interval = session.role === 'student' ? setInterval(loadProfessors, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [session]);

  function loadProfessors() {
    api('/api/professors').then(setProfessors).catch(() => {});
  }

  async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    await api('/api/auth/logout', { method: 'POST' });
    setSession(false);
    setProfessors([]);
  }

  if (session === null) return null;
  if (session === false) {
    return <Login onLoggedIn={(s) => { setSession(s); setActiveTab(s.role === 'admin' ? 'admin-home' : 'student'); }} />;
  }

  const isAdmin = session.role === 'admin';
  const studentTabs = [
    { id: 'student', label: 'Submit Tribute' },
    { id: 'gallery', label: 'Gallery' }
  ];
  const adminTabs = [
    { id: 'admin-home', label: 'Dashboard' },
    { id: 'admin-add', label: 'Add Professor' },
    { id: 'admin-directory', label: 'Directory' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'admin-send', label: 'Send to Profs' },
    { id: 'admin-settings', label: 'Settings' }
  ];
  const tabs = isAdmin ? adminTabs : studentTabs;

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
        {tabs.map((t) => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {!isAdmin && (
        <>
          <StudentSubmit
            active={activeTab === 'student'}
            studentName={session.name}
            studentInstitute={session.institute}
            professors={professors}
            onSubmitted={() => {}}
          />
          <Gallery active={activeTab === 'gallery'} onView={setModalSubmission} />
        </>
      )}

      {isAdmin && (
        <>
          <AdminHome active={activeTab === 'admin-home'} />
          <AdminAddProf active={activeTab === 'admin-add'} onAdded={loadProfessors} />
          <AdminDirectory active={activeTab === 'admin-directory'} professors={professors} />
          <Gallery active={activeTab === 'gallery'} onView={setModalSubmission} />
          <AdminSend active={activeTab === 'admin-send'} professors={professors} onView={setModalSubmission} />
          <AdminSettings active={activeTab === 'admin-settings'} onCleared={loadProfessors} />
        </>
      )}

      <MediaModal submission={modalSubmission} onClose={() => setModalSubmission(null)} />
    </div>
  );
}
