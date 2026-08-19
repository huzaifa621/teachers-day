'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { ui } from '../shared';

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-[460px] max-w-[90%] rounded-[10px] bg-white p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        <button className="absolute right-2.5 top-2 z-[2] h-[30px] w-[30px] rounded-full border-none bg-brown text-base leading-none text-white" onClick={onClose}>&times;</button>
        <h3 className="mb-3.5 text-base font-bold text-ink">Edit Professor</h3>
        {alert && <div className={`${ui.alert} ${alert.type === 'success' ? ui.alertSuccess : ui.alertError}`}>{alert.text}</div>}
        <div className={ui.formGroup}>
          <label className={ui.label}>Institute *</label>
          <select className={ui.input} value={institute} onChange={(e) => setInstitute(e.target.value)}>
            {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
        <div className={ui.formGroup}><label className={ui.label}>Professor Name *</label><input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className={ui.formGroup}><label className={ui.label}>Designation *</label><input className={ui.input} type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
        <div className={ui.formGroup}><label className={ui.label}>Email</label><input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className={ui.formGroup}>
          <label className={ui.label}>Photo</label>
          <div className={ui.uploadArea} onClick={() => photoInputRef.current.click()}>
            <p className="my-1 text-xs text-muted">Click to change photo</p>
            <input className="hidden" ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} />
          </div>
          {preview && <div><img src={preview} style={{ maxWidth: 100, border: '2px solid #8b6f47', borderRadius: 6, marginTop: 10 }} /></div>}
        </div>
        <div className="mt-4 flex gap-2.5">
          <button className={`${ui.btn} flex-1`} disabled={busy} onClick={save}>Save Changes</button>
          <button className="rounded bg-danger px-3 py-1.5 font-serif text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={remove}>Delete</button>
        </div>
      </div>
    </div>
  );
}
