'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice, ErrorState } from './shared';
import AdminLogin from './admin/AdminLogin';
import AdminHome from './admin/AdminHome';
import AdminAddProf from './admin/AdminAddProf';
import AdminDirectory from './admin/AdminDirectory';
import AdminSend from './admin/AdminSend';

const TABS = [
  { id: 'admin-home', label: 'Dashboard' },
  { id: 'admin-add', label: 'Add Professor' },
  { id: 'admin-directory', label: 'Directory' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'admin-send', label: 'Send to Profs' }
];

export default function AdminPortal() {
  const { session, setSession, logout } = useSession();
  const { institutes, error: institutesError, retry: retryInstitutes } = useInstitutes();
  const [professors, setProfessors] = useState([]);
  const [profsLoading, setProfsLoading] = useState(true);
  const [profsError, setProfsError] = useState(null);
  const [activeTab, setActiveTab] = useState('admin-home');

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'admin') return;
    loadProfessors();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadProfessors() {
    setProfsLoading(true);
    setProfsError(null);
    api('/api/professors')
      .then(setProfessors)
      .catch((e) => setProfsError(e.message || 'Could not load professors.'))
      .finally(() => setProfsLoading(false));
  }

  if (session === 'loading') return null;
  if (session === 'anon') {
    return <AdminLogin onLoggedIn={setSession} />;
  }
  if (session.role !== 'admin') {
    return <WrongRoleNotice role={session.role} expected="admins" onLogout={logout} />;
  }

  return (
    <div className="container">
      <div className="top-bar">
        <div className="brand-row">
          <img src="/masai_logo.png" alt="Masai" className="brand-logo" />
          <h1>Teachers&apos; Day Postcard Portal &mdash; Admin</h1>
        </div>
        <button className="btn logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {institutesError && (
        <ErrorState message={`Couldn't load institutes — the Add Professor and Directory forms may not work: ${institutesError}`} onRetry={retryInstitutes} />
      )}

      <AdminHome active={activeTab === 'admin-home'} />
      <AdminAddProf active={activeTab === 'admin-add'} institutes={institutes} onAdded={loadProfessors} />
      <AdminDirectory
        active={activeTab === 'admin-directory'}
        professors={professors}
        institutes={institutes}
        onChanged={loadProfessors}
        loading={profsLoading}
        loadError={profsError}
        onRetry={loadProfessors}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={true} />
      <AdminSend
        active={activeTab === 'admin-send'}
        professors={professors}
        profsLoading={profsLoading}
        profsError={profsError}
        onRetryProfessors={loadProfessors}
      />
    </div>
  );
}
