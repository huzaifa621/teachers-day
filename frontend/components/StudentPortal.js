'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession, useInstitutes } from '../lib/useSession';
import { Gallery, WrongRoleNotice } from './shared';
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
        onSubmitted={() => {}}
      />
      <Gallery active={activeTab === 'gallery'} isAdmin={false} mineOnly />
    </div>
  );
}
