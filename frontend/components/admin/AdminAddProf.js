'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { ui } from '../shared';

export default function AdminAddProf({ active, institutes, onAdded }) {
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
    <div className={active ? 'block' : 'hidden'}>
      <div className={ui.formSection}>
        <h2 className={ui.h2}>Add Professor</h2>
        {alert && <div className={`${ui.alert} ${alert.type === 'success' ? ui.alertSuccess : ui.alertError}`}>{alert.text}</div>}
        <div className={ui.formRow}>
          <div className={ui.formGroup}>
            <label className={ui.label}>Institute *</label>
            <select className={ui.input} value={institute} onChange={(e) => setInstitute(e.target.value)}>
              <option value="">Select institute</option>
              {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
            </select>
          </div>
          <div className={ui.formGroup}><label className={ui.label}>Professor Name *</label><input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
        </div>
        <div className={ui.formRow}>
          <div className={ui.formGroup}><label className={ui.label}>Designation *</label><input className={ui.input} type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g., Assistant Professor" /></div>
          <div className={ui.formGroup}><label className={ui.label}>Email</label><input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></div>
        </div>
        <div className={ui.formGroup}>
          <label className={ui.label}>Upload Photo *</label>
          <div className={ui.uploadArea} onClick={() => photoInputRef.current.click()}>
            <p className="my-1 text-xs text-muted">Click to upload</p>
            <p className="my-1 text-xs text-muted">JPG, PNG</p>
            <input className="hidden" ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} />
          </div>
          {preview && <div><img src={preview} style={{ maxWidth: 100, border: '2px solid #8b6f47', borderRadius: 6, marginTop: 10 }} /></div>}
        </div>
        <button className={`${ui.btn} ${ui.btnFull}`} disabled={busy} onClick={submit}>Add Professor</button>
      </div>
    </div>
  );
}
