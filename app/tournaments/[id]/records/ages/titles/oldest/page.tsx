import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}
function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any) {
  const p = await params;
  const { id } = p;
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = extractName(header?.name);
    if (raw) tournamentName = humanize(raw);
  } catch (e) {
    // ignore
  }

  const title = `Oldest Title Winners at ${tournamentName} | Tennis Records`;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${id}/records/ages/titles/oldest`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title,
    openGraph: { title, url: ogUrl, siteName: 'TML', images: [{ url: ogImage, alt: `${tournamentName} - Oldest Title Winners`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <AgesFull id={id} section="titles" which="oldest" />
    </div>
  );
}