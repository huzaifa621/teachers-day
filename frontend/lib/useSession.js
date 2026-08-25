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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    api('/api/institutes')
      .then(setInstitutes)
      .catch((e) => setError(e.message || 'Could not load institutes.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { institutes, loading, error, retry: load };
}
