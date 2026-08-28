import PublicTributesClient from './PublicTributesClient';
import { serverApiUrl } from '../../../lib/api';

// Distinguishes "token doesn't exist" (notFound — a normal 404) from
// "couldn't even reach the backend" (unreachable — a real outage) so the
// page can show an accurate message instead of either a misleading "not
// found" or an uncaught exception crashing to Next's raw error page.
async function getTributes(token) {
  let res;
  try {
    res = await fetch(`${serverApiUrl()}/api/public/tributes/${token}`, { cache: 'no-store' });
  } catch (_) {
    return { unreachable: true };
  }
  if (!res.ok) return { notFound: true };
  const data = await res.json().catch(() => null);
  return data ? { data } : { notFound: true };
}

// Server-rendered metadata so LinkedIn's link scraper (which doesn't run
// JS) sees a real preview card instead of the page's generic fallback title.
export async function generateMetadata({ params }) {
  const { token } = await params;
  const result = await getTributes(token);
  if (!result.data) return { title: result.unreachable ? "Teachers' Day Postcard Portal" : 'Link not found' };

  const { faculty } = result.data;
  const title = `Happy Teachers' Day, ${faculty.name}!`;
  const institutes = (faculty.institutes || []).join(' · ');
  const description = institutes
    ? `${institutes} — see the Teachers' Day tributes shared with ${faculty.name}.`
    : `See the Teachers' Day tributes shared with ${faculty.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: faculty.photo ? [faculty.photo] : []
    }
  };
}

export default async function PublicTributesPage({ params }) {
  const { token } = await params;
  const result = await getTributes(token);

  if (result.unreachable) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Couldn&apos;t load this page</h2>
        <p className="muted">Something went wrong on our end — please try refreshing in a moment.</p>
      </div>
    );
  }

  return (
    <PublicTributesClient
      faculty={result.data ? result.data.faculty : null}
      submissions={result.data ? result.data.submissions : []}
    />
  );
}
