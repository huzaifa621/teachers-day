'use client';

import { use, useEffect, useState } from 'react';
import { PostcardCard, typeLabel, ui } from '../../../components/shared';
import { API_URL } from '../../../lib/api';

export default function PublicTributesPage({ params }) {
  const { token } = use(params);
  const [state, setState] = useState({ loading: true, error: null, professor: null, submissions: [] });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/public/tributes/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || 'Could not load this link');
        setState({ loading: false, error: null, professor: data.professor, submissions: data.submissions });
      })
      .catch((err) => setState({ loading: false, error: err.message, professor: null, submissions: [] }));
  }, [token]);

  if (state.loading) {
    return (
      <div className={`${ui.container} pt-20 text-center`}>
        <p className={ui.muted}>Loading your tributes&hellip;</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`${ui.container} pt-20 text-center`}>
        <h2 className="text-2xl font-bold text-ink">Link not found</h2>
        <p className={ui.muted}>{state.error}</p>
      </div>
    );
  }

  const { professor, submissions } = state;
  const s = submissions[index];

  return (
    <div className={`${ui.container} max-w-[820px] pb-[60px] pt-10`}>
      <div className="mb-6 text-center">
        <img className="mx-auto mb-3.5 h-[30px]" src="/masai_logo.png" alt="masai" />
        <h2 className="mb-1 text-2xl font-bold text-ink">Happy Teachers&apos; Day, {professor.name}!</h2>
        <p className={ui.muted}>
          {professor.designation} &middot; {professor.institute}
        </p>
        {submissions.length > 0 && (
          <p className={`${ui.muted} mt-1.5`}>
            {typeLabel(s.type)} {index + 1} of {submissions.length}
          </p>
        )}
      </div>

      {submissions.length === 0 && (
        <p className={`${ui.muted} text-center`}>No tributes have been shared yet — check back soon.</p>
      )}

      {s && (
        <div className="text-center">
          <PostcardCard submission={s} />
        </div>
      )}

      {submissions.length > 1 && (
        <div className="mt-3.5 flex items-center justify-center gap-[18px]">
          <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setIndex((i) => (i - 1 + submissions.length) % submissions.length)}>&larr; Prev</button>
          <button className={`${ui.btnSecondary} ${ui.btnSmall}`} onClick={() => setIndex((i) => (i + 1) % submissions.length)}>Next &rarr;</button>
        </div>
      )}
    </div>
  );
}
