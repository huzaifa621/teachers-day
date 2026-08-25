'use client';

import { useState } from 'react';
import { groupByInstitute } from '../shared';
import AdminEditProf from './AdminEditProf';
import { api } from '../../lib/api';

export default function AdminDirectory({ active, professors, institutes, onChanged }) {
  const [editingProf, setEditingProf] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const groups = groupByInstitute(professors, 'institute');

  async function deleteProf(p) {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await api(`/api/professors/${p.id}`, { method: 'DELETE' });
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
        <h2>Professor Directory</h2>
        {groups.length === 0 && <p className="muted">No professors yet.</p>}
        {groups.map(([inst, profs]) => (
          <div key={inst} className="inst-group">
            <h3>{inst}</h3>
            <div className="professor-grid" style={{ maxHeight: 'none' }}>
              {profs.map((p) => (
                <div key={p.id} className="prof-card" style={{ cursor: 'default' }}>
                  <img src={p.photo} alt={p.name} />
                  <div style={{ flex: 1 }}>
                    <p><strong>{p.name}</strong></p>
                    <p>{p.designation}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'center' }}>
                    <button type="button" className="gallery-btn alt" onClick={() => setEditingProf(p)}>Edit</button>
                    <button type="button" className="gallery-btn reject" disabled={deletingId === p.id} onClick={() => deleteProf(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editingProf && (
        <AdminEditProf
          prof={editingProf}
          institutes={institutes}
          onClose={() => setEditingProf(null)}
          onSaved={() => { onChanged(); setEditingProf(null); }}
          onDeleted={() => { onChanged(); setEditingProf(null); }}
        />
      )}
    </div>
  );
}
