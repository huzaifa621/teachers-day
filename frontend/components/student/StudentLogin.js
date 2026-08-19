'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { ui } from '../shared';

export default function StudentLogin({ institutes, onLoggedIn }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institute, setInstitute] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !institute) {
      setError('Please enter your name, email and select your institute');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), institute })
      });
      onLoggedIn(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-[400px] rounded-[10px] border-[3px] border-brown bg-parchment-card p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <img className="mx-auto mb-[18px] h-[34px]" src="/masai_logo.png" alt="Masai" />
        <h2 className="mb-1.5 text-[22px] text-ink">Teachers&apos; Day Postcard Portal</h2>
        <p className="mb-5 text-sm text-muted">Student Access</p>

        <div className={ui.formGroup}>
          <label className={ui.label}>Your Full Name *</label>
          <input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
        </div>
        <div className={ui.formGroup}>
          <label className={ui.label}>Your Email *</label>
          <input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>
        <div className={ui.formGroup}>
          <label className={ui.label}>Institute *</label>
          <select className={ui.input} value={institute} onChange={(e) => setInstitute(e.target.value)}>
            <option value="">Select your institute</option>
            {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
        <button className={ui.btn} disabled={busy} onClick={submit}>Enter Portal</button>
      </div>
    </div>
  );
}
