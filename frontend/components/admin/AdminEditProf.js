'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';

export default function AdminEditProf({ prof, institutes, onClose, onSaved, onDeleted }) {
  const [institute, setInstitute] = useState(prof.institute);
  const [name, setName] = useState(prof.name);
  const [designation, setDesignation] = useState(prof.designation);
  const [email, setEmail] = useState(prof.email || '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(prof.photo);
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  function onPhotoChange(e) {
    const f = e.target.files[0];
    setPhoto(f || null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target.result);
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!institute || !name.trim() || !designation.trim()) {
      return setAlertMsg({ type: 'error', text: 'Fill all required fields' });
    }
    const fd = new FormData();
    fd.append('institute', institute);
    fd.append('name', name.trim());
    fd.append('designation', designation.trim());
    fd.append('email', email.trim());
    if (photo) fd.append('photo', photo);

    setBusy(true);
    try {
      const updated = await api(`/api/professors/${prof.id}`, { method: 'PATCH', body: fd });
      onSaved(updated);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${prof.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/professors/${prof.id}`, { method: 'DELETE' });
      onDeleted(prof.id);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
      setBusy(false);
    }
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content" style={{ width: 460, padding: 24, textAlign: 'left' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3 style={{ marginBottom: 14 }}>Edit Professor</h3>
        {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
        <div className="form-group">
          <label>Institute *</label>
          <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
            {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Professor Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-group"><label>Designation *</label><input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
        <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="form-group">
          <label>Photo</label>
          <div className="upload-area" onClick={() => photoInputRef.current.click()}>
            <p>Click to change photo</p>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} />
          </div>
          {preview && <div><img src={preview} style={{ maxWidth: 100, border: '2px solid #8b6f47', borderRadius: 6, marginTop: 10 }} /></div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={busy} onClick={save} style={{ flex: 1 }}>Save Changes</button>
          <button className="gallery-btn reject" disabled={busy} onClick={remove}>Delete</button>
        </div>
      </div>
    </div>
  );
}
