'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

// status: 'loading' | 'anon' | { role, name, institute }
export function useSession() {
  const [session, setSession] = useState('loading');

  function refresh() {
    return api('/api/auth/me').then((data) => {
      setSession(data.role ? data : 'anon');
      return data;
    }).catch(() => setSession('anon'));
  }

  useEffect(() => { refresh(); }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setSession('anon');
  }

  return { session, setSession, refresh, logout };
}

export function useInstitutes() {
  const [institutes, setInstitutes] = useState([]);
  useEffect(() => { api('/api/institutes').then(setInstitutes).catch(() => {}); }, []);
  return institutes;
}
