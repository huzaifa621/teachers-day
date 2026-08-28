'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { uploadDirect } from '../../lib/upload';
import InstitutePicker from './InstitutePicker';

// Keep in sync with the photo limit in backend/src/routes/uploads.js —
// an early, friendly rejection instead of waiting on a doomed upload.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export default function AdminAddFaculty({ active, institutes, onAdded }) {
  const [selectedInstitutes, setSelectedInstitutes] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [alert, setAlertMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  function onPhotoChange(e) {
    const f = e.target.files[0];
    if (!f) { setPhoto(null); setPreview(null); return; }
    if (f.size > MAX_PHOTO_BYTES) {
      setAlertMsg({ type: 'error', text: `That photo is ${(f.size / (1024 * 1024)).toFixed(1)}MB — the limit is 8MB. Pick a smaller file.` });
      e.target.value = '';
      setPhoto(null);
      setPreview(null);
      return;
    }
    setPhoto(f);
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target.result);
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (selectedInstitutes.length === 0) {
      return setAlertMsg({ type: 'error', text: 'Select at least one institute' });
    }
    if (!name.trim() || !email.trim() || !photo) {
      return setAlertMsg({ type: 'error', text: 'Name, email and photo are required' });
    }
    setBusy(true);
    try {
      // Photo goes browser -> S3 directly; the API only receives its key.
      const { key, token } = await uploadDirect('photo', photo);
      const member = await api('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutes: selectedInstitutes,
          name: name.trim(),
          email: email.trim(),
          photoKey: key,
          photoToken: token
        })
      });
      setSelectedInstitutes([]); setName(''); setEmail('');
      setPhoto(null); setPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setAlertMsg({ type: 'success', text: `${member.name} added!` });
      onAdded(member);
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Add Faculty</h2>
        {alert && <div className={`alert ${alert.type} show`}>{alert.text}</div>}
        <InstitutePicker institutes={institutes} selected={selectedInstitutes} onChange={setSelectedInstitutes} disabled={busy} />
        <div className="form-row">
          <div className="form-group"><label>Faculty Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@institute.edu" />
            <p className="muted" style={{ marginTop: 4 }}>Used as the unique identifier — one faculty member, one email.</p>
          </div>
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
        <button className="btn btn-full" disabled={busy} onClick={submit}>{busy ? 'Adding...' : 'Add Faculty'}</button>
      </div>
    </div>
  );
}
