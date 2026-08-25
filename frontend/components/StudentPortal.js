'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice } from './shared';
import StudentLogin from './student/StudentLogin';
import StudentSubmit from './student/StudentSubmit';

export default function StudentPortal() {
  const { session, setSession, logout } = useSession();
  const { institutes, loading: institutesLoading, error: institutesError, retry: retryInstitutes } = useInstitutes();
  const [professors, setProfessors] = useState([]);
  const [profsLoading, setProfsLoading] = useState(true);
  const [profsError, setProfsError] = useState(null);
  const [activeTab, setActiveTab] = useState('student');
  // setInterval below closes over loadProfessors once, at effect-setup
  // time — a ref (unlike reading `professors` directly) always reflects
  // the latest list even from that stale closure.
  const professorsRef = useRef([]);
  useEffect(() => { professorsRef.current = professors; }, [professors]);

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'student') return;
    loadProfessors();
    const interval = setInterval(loadProfessors, 5000);
    return () => clearInterval(interval);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadProfessors() {
    api('/api/professors')
      .then((data) => { setProfessors(data); setProfsError(null); })
      .catch((e) => {
        // The 5s polling interval keeps retrying on its own, so a background
        // poll failure shouldn't wipe an already-loaded list — only surface
        // the error state if we don't have anything to show yet.
        if (professorsRef.current.length === 0) setProfsError(e.message || 'Could not load professors.');
      })
      .finally(() => setProfsLoading(false));
  }

  if (session === 'loading') return null;
  if (session === 'anon') {
    return (
      <StudentLogin
        institutes={institutes}
        institutesLoading={institutesLoading}
        institutesError={institutesError}
        onRetryInstitutes={retryInstitutes}
        onLoggedIn={setSession}
      />
    );
  }
  if (session.role !== 'student') {
    return <WrongRoleNotice role={session.role} expected="students" onLogout={logout} />;
  }

  return (
    <div className="container">
      <div className="top-bar">
        <div className="brand-row">
          <img src="/masai_logo.png" alt="Masai" className="brand-logo" />
          <h1>Teachers&apos; Day Postcard Portal</h1>
        </div>
        <button className="btn logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>Submit Tribute</button>
        <button className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Gallery</button>
      </div>

      <StudentSubmit
        active={activeTab === 'student'}
        studentName={session.name}
        professors={professors}
        profsLoading={profsLoading}
        profsError={profsError}
        onRetryProfessors={loadProfessors}
        onSubmitted={() => {}}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={false} mineOnly />
    </div>
  );
}
