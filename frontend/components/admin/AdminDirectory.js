'use client';

import { useState } from 'react';
import { groupByInstitute } from '../shared';
import AdminEditProf from './AdminEditProf';

export default function AdminDirectory({ active, professors, institutes, onChanged }) {
  const [editingProf, setEditingProf] = useState(null);
  const groups = groupByInstitute(professors, 'institute');

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
                  <p><strong>{p.name}</strong></p>
                  <p>{p.designation}</p>
                  <button type="button" className="gallery-btn alt" style={{ marginTop: 6 }} onClick={() => setEditingProf(p)}>Edit</button>
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
