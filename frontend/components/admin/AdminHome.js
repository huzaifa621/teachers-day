'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ui } from '../shared';

export default function AdminHome({ active }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!active) return;
    api('/api/stats').then(setStats).catch(() => {});
  }, [active]);

  return (
    <div className={active ? 'block' : 'hidden'}>
      <div className={ui.formSection}>
        <h2 className={ui.h2}>Dashboard</h2>
        <div className={ui.statsGrid}>
          <div className={ui.statCard}><h3 className="mb-1 text-2xl text-brown">{stats?.institutes ?? 0}</h3><p className="text-xs text-muted">Institutes</p></div>
          <div className={ui.statCard}><h3 className="mb-1 text-2xl text-brown">{stats?.professors ?? 0}</h3><p className="text-xs text-muted">Professors</p></div>
          <div className={ui.statCard}><h3 className="mb-1 text-2xl text-brown">{stats?.submissions ?? 0}</h3><p className="text-xs text-muted">Tributes</p></div>
          <div className={ui.statCard}><h3 className="mb-1 text-2xl text-brown">{stats?.students ?? 0}</h3><p className="text-xs text-muted">Students</p></div>
        </div>
      </div>
    </div>
  );
}
