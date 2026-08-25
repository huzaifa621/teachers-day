import PublicTributesClient from './PublicTributesClient';
import { API_URL } from '../../../lib/api';

async function getTributes(token) {
  const res = await fetch(`${API_URL}/api/public/tributes/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// Server-rendered metadata so LinkedIn's link scraper (which doesn't run
// JS) sees a real preview card instead of the page's generic fallback title.
export async function generateMetadata({ params }) {
  const { token } = await params;
  const data = await getTributes(token);
  if (!data) return { title: 'Link not found' };

  const { professor } = data;
  const title = `Happy Teachers' Day, ${professor.name}!`;
  const description = `${professor.designation} · ${professor.institute} — see the Teachers' Day tributes shared with ${professor.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: professor.photo ? [professor.photo] : []
    }
  };
}

export default async function PublicTributesPage({ params }) {
  const { token } = await params;
  const data = await getTributes(token);

  return (
    <PublicTributesClient
      professor={data ? data.professor : null}
      submissions={data ? data.submissions : []}
    />
  );
}
