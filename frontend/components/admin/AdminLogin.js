'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { ui } from '../shared';

export default function AdminLogin({ onLoggedIn }) {
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
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-[400px] rounded-[10px] border-[3px] border-brown bg-parchment-card p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <img className="mx-auto mb-[18px] h-[34px]" src="/masai_logo.png" alt="Masai" />
        <h2 className="mb-1.5 text-[22px] text-ink">Teachers&apos; Day Postcard Portal</h2>
        <p className="mb-5 text-sm text-muted">Admin Access</p>

        <div className={ui.formGroup}>
          <label className={ui.label}>Admin Password *</label>
          <input className={ui.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
        <button className={ui.btn} disabled={busy} onClick={submit}>Login as Admin</button>
      </div>
    </div>
  );
}
