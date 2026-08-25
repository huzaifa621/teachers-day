import { PostcardCard } from '../../../components/shared';
import { serverApiUrl } from '../../../lib/api';

// Distinguishes "submission doesn't exist / isn't approved" (notFound — a
// normal 404) from "couldn't even reach the backend" (unreachable — a real
// outage) so the page can show an accurate message instead of either a
// misleading "not found" or an uncaught exception crashing to Next's raw
// error page.
async function getSubmission(id) {
  let res;
  try {
    res = await fetch(`${serverApiUrl()}/api/public/submission/${id}`, { cache: 'no-store' });
  } catch (_) {
    return { unreachable: true };
  }
  if (!res.ok) return { notFound: true };
  const data = await res.json().catch(() => null);
  return data && data.submission ? { data: data.submission } : { notFound: true };
}

// Server-rendered metadata so LinkedIn's link scraper (which doesn't run
// JS) sees a real preview card instead of the page's generic fallback title.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getSubmission(id);
  if (!result.data) return { title: result.unreachable ? "Teachers' Day Postcard Portal" : 'Tribute not found' };

  const submission = result.data;
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
  const result = await getSubmission(id);

  if (result.unreachable) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Couldn&apos;t load this page</h2>
        <p className="muted">Something went wrong on our end — please try refreshing in a moment.</p>
      </div>
    );
  }

  if (!result.data) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Link not found</h2>
        <p className="muted">This tribute isn&apos;t available &mdash; it may have been removed.</p>
      </div>
    );
  }

  const submission = result.data;

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
