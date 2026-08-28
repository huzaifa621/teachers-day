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
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState(null);
  const [activeTab, setActiveTab] = useState('student');
  // setInterval below closes over loadFaculty once, at effect-setup
  // time — a ref (unlike reading `facultyList` directly) always reflects
  // the latest list even from that stale closure.
  const facultyRef = useRef([]);
  useEffect(() => { facultyRef.current = facultyList; }, [facultyList]);

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'student') return;
    loadFaculty();
    const interval = setInterval(loadFaculty, 5000);
    return () => clearInterval(interval);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadFaculty() {
    api('/api/faculty')
      .then((data) => { setFacultyList(data); setFacultyError(null); })
      .catch((e) => {
        // The 5s polling interval keeps retrying on its own, so a background
        // poll failure shouldn't wipe an already-loaded list — only surface
        // the error state if we don't have anything to show yet.
        if (facultyRef.current.length === 0) setFacultyError(e.message || 'Could not load faculty.');
      })
      .finally(() => setFacultyLoading(false));
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
        facultyList={facultyList}
        facultyLoading={facultyLoading}
        facultyError={facultyError}
        onRetryFaculty={loadFaculty}
        onSubmitted={() => {}}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={false} mineOnly />
    </div>
  );
}
