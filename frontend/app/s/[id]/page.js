import { PostcardCard } from '../../../components/shared';
import { serverApiUrl } from '../../../lib/api';

async function getSubmission(id) {
  const res = await fetch(`${serverApiUrl()}/api/public/submission/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data ? data.submission : null;
}

// Server-rendered metadata so LinkedIn's link scraper (which doesn't run
// JS) sees a real preview card instead of the page's generic fallback title.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const submission = await getSubmission(id);
  if (!submission) return { title: 'Tribute not found' };

  const title = `Happy Teachers' Day, ${submission.profName}!`;
  const description = submission.message
    ? `"${submission.message.slice(0, 150)}" — from ${submission.studentName}`
    : `A Teachers' Day tribute from ${submission.studentName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: submission.profPhoto ? [submission.profPhoto] : []
    }
  };
}

export default async function SharedTributePage({ params }) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Link not found</h2>
        <p className="muted">This tribute isn&apos;t available &mdash; it may have been removed.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/masai_logo.png" alt="masai" style={{ height: 30, marginBottom: 14 }} />
        <h2 style={{ marginBottom: 4 }}>Happy Teachers&apos; Day, {submission.profName}!</h2>
        <p className="muted">{submission.profInstitute}</p>
      </div>

      <div className="slider-body">
        <PostcardCard submission={submission} />
      </div>
    </div>
  );
}
