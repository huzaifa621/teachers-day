'use client';

import { useState } from 'react';
import { api } from '../../lib/api';

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
    <div className="login-container show">
      <div className="login-box">
        <img className="login-logo" src="/masai_logo.png" alt="Masai" />
        <h2>Teachers&apos; Day Postcard Portal</h2>
        <p>Student Access</p>

        <div className="form-group">
          <label>Your Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
        </div>
        <div className="form-group">
          <label>Your Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>
        <div className="form-group">
          <label>Institute *</label>
          <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
            <option value="">Select your institute</option>
            {institutes.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
        {error && <div className="alert error show">{error}</div>}
        <button className="btn" disabled={busy} onClick={submit}>Enter Portal</button>
      </div>
    </div>
  );
}
