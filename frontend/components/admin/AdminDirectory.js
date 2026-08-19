'use client';

import { useState } from 'react';
import { groupByInstitute, ui } from '../shared';
import AdminEditProf from './AdminEditProf';

export default function AdminDirectory({ active, professors, institutes, onChanged }) {
  const [editingProf, setEditingProf] = useState(null);
  const groups = groupByInstitute(professors, 'institute');

  return (
    <div className={active ? 'block' : 'hidden'}>
      <div className={ui.formSection}>
        <h2 className={ui.h2}>Professor Directory</h2>
        {groups.length === 0 && <p className={ui.muted}>No professors yet.</p>}
        {groups.map(([inst, profs]) => (
          <div key={inst} className="mb-[22px]">
            <h3 className="mb-2.5 text-base font-bold text-ink">{inst}</h3>
            <div className={`${ui.professorGrid} !max-h-none`}>
              {profs.map((p) => (
                <div key={p.id} className={`${ui.profCard} cursor-default`}>
                  <img src={p.photo} alt={p.name} />
                  <p><strong>{p.name}</strong></p>
                  <p>{p.designation}</p>
                  <button type="button" className="mt-1.5 rounded bg-brown-deep px-3 py-1.5 font-serif text-[11px] text-white" onClick={() => setEditingProf(p)}>Edit</button>
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
