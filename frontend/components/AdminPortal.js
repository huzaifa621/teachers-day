'use client';

import { useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice, groupByInstitute, typeLabel, ProfessorPreviewSlider } from './shared';

function AdminLogin({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
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
        <p>Admin Access</p>

        <div className="form-group">
          <label>Admin Password *</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        {error && <div className="alert error show">{error}</div>}
        <button className="btn" disabled={busy} onClick={submit}>Login as Admin</button>
      </div>
    </div>
  );
}

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
        </div>
      </div>
    </div>
  );
}

function AdminAddProf({ active, institutes, onAdded }) {
  const [institute, setInstitute] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
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
    if (!institute || !name.trim() || !designation.trim() || !photo) {
      return setAlertMsg({ type: 'error', text: 'Fill all required fields' });
    }
    const fd = new FormData();
    fd.append('institute', institute);
    fd.append('name', name.trim());
    fd.append('designation', designation.trim());
    fd.append('email', email.trim());
    fd.append('photo', photo);

    setBusy(true);
    try {
      const prof = await api('/api/professors', { method: 'POST', body: fd });
      setInstitute(''); setName(''); setDesignation(''); setEmail('');
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
          <div className="form-group">
            <label>Institute *</label>
            <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
              <option value="">Select institute</option>
              {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Professor Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Designation *</label><input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g., Assistant Professor" /></div>
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

function AdminDirectory({ active, professors }) {
  const groups = groupByInstitute(professors, 'institute');

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Professor Directory</h2>
        {groups.length === 0 && <p className="muted">No professors yet.</p>}
        {groups.map(([inst, profs]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="professor-grid" style={{ maxHeight: 'none' }}>
              {profs.map((p) => (
                <div key={p.id} className="prof-card" style={{ cursor: 'default' }}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p>{p.designation}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSend({ active, professors }) {
  const [subs, setSubs] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [template, setTemplate] = useState('');
  const [checked, setChecked] = useState({});
  const [previewProf, setPreviewProf] = useState(null);
  const [sendNotice, setSendNotice] = useState(null);

  useEffect(() => {
    if (!active) return;
    api('/api/submissions').then(setSubs).catch(() => {});
  }, [active]);

  const approvedSubs = subs.filter((s) => s.status === 'approved');
  const groups = groupByInstitute(professors, 'institute');

  function toggleChecked(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSend() {
    const selectedCount = professors.filter((p) => checked[p.id]).length;
    setSendNotice(
      selectedCount === 0
        ? 'Select at least one professor to send to.'
        : `Email sending isn't connected yet (${selectedCount} professor${selectedCount === 1 ? '' : 's'} selected). This will go out once the Google account integration is set up.`
    );
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Send Tributes to Professors</h2>
        <p className="muted">
          Download each professor&apos;s message tributes as one combined PDF, and download each video or PDF
          tribute individually, then share them over WhatsApp or email.
        </p>

        <div className="form-section nested">
          <h3>Email Template</h3>
          <div className="form-group">
            <label>Message body</label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Dear Professor, on the occasion of Teachers' Day, students of your institute have sent you tributes..."
              style={{ minHeight: 140 }}
            />
          </div>
          {sendNotice && <div className="alert show" style={{ display: 'block', background: '#f0e6cf', borderLeft: '4px solid var(--brown)' }}>{sendNotice}</div>}
          <button className="btn-secondary btn-small" onClick={handleSend}>Send</button>
        </div>

        {groups.length === 0 && <p className="muted">No professors yet.</p>}
        {groups.map(([inst, profs]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            {profs.map((p) => {
              const profSubs = approvedSubs.filter((s) => s.profId === p.id);
              const textCount = profSubs.filter((s) => s.type === 'text').length;
              const mediaSubs = profSubs.filter((s) => s.type !== 'text');
              return (
                <div key={p.id} className="prof-send-row">
                  <div className="who">
                    <label style={{ marginRight: 4 }}>
                      <input type="checkbox" checked={!!checked[p.id]} onChange={() => toggleChecked(p.id)} />
                    </label>
                    <img src={p.photo} alt={p.name} />
                    <div>
                      <div><strong>{p.name}</strong></div>
                      <div className="meta">{p.designation} &middot; {profSubs.length} approved tribute(s)</div>
                    </div>
                  </div>
                  <div className="actions">
                    <button className="btn-secondary btn-small" onClick={() => setPreviewProf(p)}>Preview</button>
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
                            <span className="media-row-thumb">
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

export default function AdminPortal() {
  const { session, setSession, logout } = useSession();
  const institutes = useInstitutes();
  const [professors, setProfessors] = useState([]);
  const [activeTab, setActiveTab] = useState('admin-home');

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'admin') return;
    loadProfessors();
  }, [session]);

  function loadProfessors() {
    api('/api/professors').then(setProfessors).catch(() => {});
  }

  if (session === 'loading') return null;
  if (session === 'anon') {
    return <AdminLogin onLoggedIn={setSession} />;
  }
  if (session.role !== 'admin') {
    return <WrongRoleNotice role={session.role} expected="admins" onLogout={logout} />;
  }

  const tabs = [
    { id: 'admin-home', label: 'Dashboard' },
    { id: 'admin-add', label: 'Add Professor' },
    { id: 'admin-directory', label: 'Directory' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'admin-send', label: 'Send to Profs' }
  ];

  return (
    <div className="container">
      <div className="top-bar">
        <div className="brand-row">
          <img src="/masai_logo.png" alt="Masai" className="brand-logo" />
          <h1>Teachers&apos; Day Postcard Portal &mdash; Admin</h1>
        </div>
        <button className="btn logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <AdminHome active={activeTab === 'admin-home'} />
      <AdminAddProf active={activeTab === 'admin-add'} institutes={institutes} onAdded={loadProfessors} />
      <AdminDirectory active={activeTab === 'admin-directory'} professors={professors} />
      <Gallery active={activeTab === 'gallery'} isAdmin={true} />
      <AdminSend active={activeTab === 'admin-send'} professors={professors} />
    </div>
  );
}
