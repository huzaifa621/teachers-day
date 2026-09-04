'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice, ErrorState } from './shared';
import AdminLogin from './admin/AdminLogin';
import AdminHome from './admin/AdminHome';
import AdminAddFaculty from './admin/AdminAddFaculty';
import AdminDirectory from './admin/AdminDirectory';
import AdminSend from './admin/AdminSend';
import AdminLinkedInSettings from './admin/AdminLinkedInSettings';

const TABS = [
  { id: 'admin-home', label: 'Dashboard' },
  { id: 'admin-add', label: 'Add Faculty' },
  { id: 'admin-directory', label: 'Directory' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'admin-send', label: 'Send to Faculty' }
];

const HIDDEN_TAB = { id: 'admin-linkedin-settings', label: 'Update LinkedIn Post' };

export default function AdminPortal() {
  const { session, setSession, logout } = useSession();
  const { institutes, error: institutesError, retry: retryInstitutes } = useInstitutes();
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState(null);
  const [activeTab, setActiveTab] = useState('admin-home');
  // Session-only — a refresh or fresh login hides the tab again until the
  // shortcut is pressed once more. Not a real access boundary (the API
  // routes are already admin-gated); this is just an uncluttered tab bar.
  const [linkedInSettingsUnlocked, setLinkedInSettingsUnlocked] = useState(false);

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'admin') return;
    loadFaculty();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setLinkedInSettingsUnlocked(true);
        setActiveTab(HIDDEN_TAB.id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function loadFaculty() {
    setFacultyLoading(true);
    setFacultyError(null);
    api('/api/faculty')
      .then(setFacultyList)
      .catch((e) => setFacultyError(e.message || 'Could not load faculty.'))
      .finally(() => setFacultyLoading(false));
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
        {linkedInSettingsUnlocked && (
          <button className={`tab-btn ${activeTab === HIDDEN_TAB.id ? 'active' : ''}`} onClick={() => setActiveTab(HIDDEN_TAB.id)}>{HIDDEN_TAB.label}</button>
        )}
      </div>

      {institutesError && (
        <ErrorState message={`Couldn't load institutes — the Add Faculty and Directory forms may not work: ${institutesError}`} onRetry={retryInstitutes} />
      )}

      <AdminHome active={activeTab === 'admin-home'} />
      <AdminAddFaculty active={activeTab === 'admin-add'} institutes={institutes} onAdded={loadFaculty} />
      <AdminDirectory
        active={activeTab === 'admin-directory'}
        facultyList={facultyList}
        institutes={institutes}
        onChanged={loadFaculty}
        loading={facultyLoading}
        loadError={facultyError}
        onRetry={loadFaculty}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={true} />
      <AdminSend
        active={activeTab === 'admin-send'}
        facultyList={facultyList}
        facultyLoading={facultyLoading}
        facultyError={facultyError}
        onRetryFaculty={loadFaculty}
      />
      {linkedInSettingsUnlocked && <AdminLinkedInSettings active={activeTab === HIDDEN_TAB.id} />}
    </div>
  );
}
