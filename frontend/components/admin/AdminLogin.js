'use client';

import { useState } from 'react';
import { api } from '../../lib/api';

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
