'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AdminHome({ active }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!active) return;
    api('/api/stats').then(setStats).catch(() => {});
  }, [active]);

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-card"><h3>{stats?.institutes ?? 0}</h3><p>Institutes</p></div>
          <div className="stat-card"><h3>{stats?.professors ?? 0}</h3><p>Professors</p></div>
          <div className="stat-card"><h3>{stats?.submissions ?? 0}</h3><p>Tributes</p></div>
          <div className="stat-card"><h3>{stats?.students ?? 0}</h3><p>Students</p></div>
        </div>
      </div>
    </div>
  );
}
