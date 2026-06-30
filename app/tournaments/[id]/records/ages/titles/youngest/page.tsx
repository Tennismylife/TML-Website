import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import RecordsBreadcrumb from '../../../RecordsBreadcrumb';

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

  const title = `Youngest Title Winners at ${tournamentName} | Tennis Records`;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug (prefer slug for URLs)
  let canonicalSlug = String(id);
  if (/^\d+$/.test(String(id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true } });
      canonicalSlug = t?.slug ?? canonicalId;
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(id) }, select: { slug: true } });
    canonicalSlug = t?.slug ?? String(id);
  }

  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/ages/titles/youngest`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title,
    openGraph: { title, url: ogUrl, siteName: 'TennisMyLife', images: [{ url: ogImage, alt: `${tournamentName} - Youngest Title Winners`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  return (
    <div className="w-full mx-auto text-white relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Ages', item: `${site}/tournaments/${slugId}/records/ages/main` }, { '@type': 'ListItem', position: 6, name: 'Title Ages', item: `${site}/tournaments/${slugId}/records/ages/titles` }, { '@type': 'ListItem', position: 7, name: 'Youngest Champions', item: `${site}/tournaments/${slugId}/records/ages/titles/youngest` }] }) }} />
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <div className="pt-14 px-2">
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Ages', href: `/tournaments/${slugId}/records/ages/main` }, { label: 'Title Ages', href: `/tournaments/${slugId}/records/ages/titles` }, { label: 'Youngest Champions' }]} />
      </div>
      <AgesFull id={id} section="titles" which="youngest" />
    </div>
  );
}
