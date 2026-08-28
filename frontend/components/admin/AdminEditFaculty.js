'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { uploadDirect } from '../../lib/upload';
import InstitutePicker from './InstitutePicker';

// Keep in sync with the photo limit in backend/src/routes/uploads.js —
// an early, friendly rejection instead of waiting on a doomed upload.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export default function AdminEditFaculty({ member, institutes, onClose, onSaved, onDeleted }) {
  const [selectedInstitutes, setSelectedInstitutes] = useState(member.institutes || []);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email || '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(member.photo);
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  function onPhotoChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_PHOTO_BYTES) {
      setAlertMsg({ type: 'error', text: `That photo is ${(f.size / (1024 * 1024)).toFixed(1)}MB — the limit is 8MB. Pick a smaller file.` });
      e.target.value = '';
      return;
    }
    setPhoto(f);
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target.result);
    reader.readAsDataURL(f);
  }

  async function save() {
    if (selectedInstitutes.length === 0) {
      return setAlertMsg({ type: 'error', text: 'Select at least one institute' });
    }
    if (!name.trim() || !email.trim()) {
      return setAlertMsg({ type: 'error', text: 'Name and email are required' });
    }
    setBusy(true);
    try {
      const body = {
        institutes: selectedInstitutes,
        name: name.trim(),
        email: email.trim()
      };
      // Only when a new photo was picked — otherwise the existing one stays.
      if (photo) {
        const { key, token } = await uploadDirect('photo', photo);
        body.photoKey = key;
        body.photoToken = token;
      }
      const updated = await api(`/api/faculty/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      onSaved(updated);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/faculty/${member.id}`, { method: 'DELETE' });
      onDeleted(member.id);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content" style={{ width: 460, padding: 24, textAlign: 'left' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3 style={{ marginBottom: 14 }}>Edit Faculty</h3>
        {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
        <InstitutePicker institutes={institutes} selected={selectedInstitutes} onChange={setSelectedInstitutes} disabled={busy} />
        <div className="form-group"><label>Faculty Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-group">
          <label>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Photo</label>
          <div className="upload-area" onClick={() => photoInputRef.current.click()}>
            <p>Click to change photo</p>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} />
          </div>
          {preview && <div><img src={preview} style={{ maxWidth: 100, border: '2px solid #8b6f47', borderRadius: 6, marginTop: 10 }} /></div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={busy} onClick={save} style={{ flex: 1 }}>{busy ? 'Saving...' : 'Save Changes'}</button>
          <button className="gallery-btn reject" disabled={busy} onClick={remove}>{busy ? 'Working...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}
