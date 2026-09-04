'use client';

import { useState } from 'react';
import { groupByInstitutes, Loader, ErrorState, FacultyPhoto } from '../shared';
import AdminEditFaculty from './AdminEditFaculty';
import { api } from '../../lib/api';

export default function AdminDirectory({ active, facultyList, institutes, onChanged, loading, loadError, onRetry }) {
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const groups = groupByInstitutes(facultyList, 'institutes');

  async function deleteFaculty(p) {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await api(`/api/faculty/${p.id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={`tab-content ${active ? 'active' : ''}`}>
      <div className="form-section">
        <h2>Faculty Directory</h2>
        {loading && <Loader text="Loading faculty…" />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={onRetry} />}
        {!loading && !loadError && groups.length === 0 && <p className="muted">No faculty yet.</p>}
        {!loading && !loadError && groups.map(([inst, facultyList]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="faculty-grid directory">
              {facultyList.map((p) => (
                <div key={p.id} className="faculty-card" style={{ cursor: 'default' }}>
                  <FacultyPhoto src={p.photo} alt={p.name} />
                  <div style={{ flex: 1 }}>
                    <p><strong>{p.name}</strong></p>
                    <p className="muted tiny">{p.email}</p>
                    {/* Their other affiliations, so it's clear why the same
                        person shows up under more than one institute. */}
                    {(p.institutes || []).length > 1 && (
                      <div className="institute-chips">
                        {p.institutes.filter((i) => i !== inst).map((i) => (
                          <span key={i} className="institute-chip">{i}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="faculty-card-actions">
                    <button type="button" className="gallery-btn alt" onClick={() => setEditingFaculty(p)}>Edit</button>
                    <button type="button" className="gallery-btn reject" disabled={deletingId === p.id} onClick={() => deleteFaculty(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editingFaculty && (
        <AdminEditFaculty
          member={editingFaculty}
          institutes={institutes}
          onClose={() => setEditingFaculty(null)}
          onSaved={() => { onChanged(); setEditingFaculty(null); }}
          onDeleted={() => { onChanged(); setEditingFaculty(null); }}
        />
      )}
    </div>
  );
}
