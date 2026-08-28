'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader, ErrorState } from '../shared';

export default function AdminHome({ active }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    api('/api/stats')
      .then(setStats)
      .catch((e) => setError(e.message || 'Could not load stats.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!active) return;
    load();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Dashboard</h2>
        {loading && <Loader text="Loading stats…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && (
          <div className="stats-grid">
            <div className="stat-card"><h3>{stats?.institutes ?? 0}</h3><p>Institutes</p></div>
            <div className="stat-card"><h3>{stats?.faculty ?? 0}</h3><p>Faculty</p></div>
            <div className="stat-card"><h3>{stats?.submissions ?? 0}</h3><p>Tributes</p></div>
            <div className="stat-card"><h3>{stats?.students ?? 0}</h3><p>Students</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
