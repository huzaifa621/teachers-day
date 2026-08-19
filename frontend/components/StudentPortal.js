'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice, ui } from './shared';
import StudentLogin from './student/StudentLogin';
import StudentSubmit from './student/StudentSubmit';

export default function StudentPortal() {
  const { session, setSession, logout } = useSession();
  const institutes = useInstitutes();
  const [professors, setProfessors] = useState([]);
  const [activeTab, setActiveTab] = useState('student');

  useEffect(() => {
    if (!session || session === 'loading' || session === 'anon' || session.role !== 'student') return;
    loadProfessors();
    const interval = setInterval(loadProfessors, 5000);
    return () => clearInterval(interval);
  }, [session]);

  function loadProfessors() {
    api('/api/professors').then(setProfessors).catch(() => {});
  }

  if (session === 'loading') return null;
  if (session === 'anon') {
    return <StudentLogin institutes={institutes} onLoggedIn={setSession} />;
  }
  if (session.role !== 'student') {
    return <WrongRoleNotice role={session.role} expected="students" onLogout={logout} />;
  }

  return (
    <div className={ui.container}>
      <div className={ui.topBar}>
        <div className={ui.brandRow}>
          <img src="/masai_logo.png" alt="Masai" className={ui.brandLogo} />
          <h1 className={ui.h1}>Teachers&apos; Day Postcard Portal</h1>
        </div>
        <button className={`${ui.btn} ${ui.logoutBtn}`} onClick={logout}>Logout</button>
      </div>

      <div className={ui.tabs}>
        <button className={`${ui.tabBtn} ${activeTab === 'student' ? ui.tabBtnActive : ''}`} onClick={() => setActiveTab('student')}>Submit Tribute</button>
        <button className={`${ui.tabBtn} ${activeTab === 'gallery' ? ui.tabBtnActive : ''}`} onClick={() => setActiveTab('gallery')}>Gallery</button>
      </div>

      <StudentSubmit
        active={activeTab === 'student'}
        studentName={session.name}
        professors={professors}
        onSubmitted={() => {}}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={false} mineOnly />
    </div>
  );
}
