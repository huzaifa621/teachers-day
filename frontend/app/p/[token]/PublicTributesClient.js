'use client';

import { useState } from 'react';
import { PostcardCard, typeLabel } from '../../../components/shared';
import { copyToClipboard } from '../../../lib/clipboard';
import { openLinkedInShare } from '../../../lib/share';

export default function PublicTributesClient({ professor, submissions }) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!professor) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Link not found</h2>
        <p className="muted">This link isn&apos;t available.</p>
      </div>
    );
  }

  const s = submissions[index];

  async function handleShare() {
    try {
      await copyToClipboard(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      alert('Could not copy the link');
    }
  }

  function handleLinkedInShare() {
    openLinkedInShare(window.location.href);
  }

  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
        <button className="btn-secondary btn-small" onClick={handleShare}>{copied ? 'Copied!' : 'Share'}</button>
        <button className="btn-secondary btn-small" onClick={handleLinkedInShare}>LinkedIn</button>
      </div>

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
