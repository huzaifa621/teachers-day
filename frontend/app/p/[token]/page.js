'use client';

import { use, useEffect, useState } from 'react';
import { PostcardCard, typeLabel } from '../../../components/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4173';

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
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p className="muted">Loading your tributes&hellip;</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Link not found</h2>
        <p className="muted">{state.error}</p>
      </div>
    );
  }

  const { professor, submissions } = state;
  const s = submissions[index];

  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/masai_logo.png" alt="masai" style={{ height: 30, marginBottom: 14 }} />
        <h2 style={{ marginBottom: 4 }}>Happy Teachers&apos; Day, {professor.name}!</h2>
        <p className="muted">
          {professor.designation} &middot; {professor.institute}
        </p>
        {submissions.length > 0 && (
          <p className="muted" style={{ marginTop: 6 }}>
            {typeLabel(s.type)} {index + 1} of {submissions.length}
          </p>
        )}
      </div>

      {submissions.length === 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>No tributes have been shared yet — check back soon.</p>
      )}

      {s && (
        <div className="slider-body">
          <PostcardCard submission={s} />
        </div>
      )}

      {submissions.length > 1 && (
        <div className="slider-controls-centered">
          <button className="btn-secondary btn-small" onClick={() => setIndex((i) => (i - 1 + submissions.length) % submissions.length)}>&larr; Prev</button>
          <button className="btn-secondary btn-small" onClick={() => setIndex((i) => (i + 1) % submissions.length)}>Next &rarr;</button>
        </div>
      )}
    </div>
  );
}
