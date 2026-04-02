import RoundOnEntriesFull from '@/app/tournaments/[id]/records/roundsonentries/_components/RoundOnEntriesFull';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { makeTitle } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../../RecordsWebPageJsonLd';
import RecordsBreadcrumb from '../../../RecordsBreadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
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

  // Special-case Winner -> Titles phrasing
  const label = String(title).toLowerCase() === 'winner' ? 'Most Titles on Entries' : `Most ${getRoundFullName(String(title))} on Entries`;
  const siteTitle = makeTitle(label, tournamentName);
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/rounds-on-entries/${title}`;
  return {
    title: siteTitle,
    openGraph: { title: siteTitle, url: ogUrl, siteName: 'TennisMyLife', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: siteTitle, images: [`${site}/og/site-preview.png`] },
    alternates: { canonical: ogUrl },
  };
} 

export default async function RoundPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const label = String(title).toLowerCase() === 'winner' ? 'Most Titles on Entries' : `Most ${getRoundFullName(String(title))} on Entries`;
  const pageTitle = makeTitle(label, tournamentName);
  const canonical = `${site}/tournaments/${slugId}/records/rounds-on-entries/${encodeURIComponent(String(title))}`;
  return (
    <div className="w-full mx-auto text-white relative">
      <RecordsWebPageJsonLd
        pageTitle={pageTitle}
        pageDescription={`${label} at ${tournamentName}`}
        canonical={canonical}
        keywords={`${tournamentName}, rounds on entries, ${label}, tennis records`}
      />
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Rounds on Entries', item: `${site}/tournaments/${slugId}/records/rounds-on-entries` }, { '@type': 'ListItem', position: 6, name: label, item: canonical }] }) }} />
      <div className="pt-14 px-2">
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Rounds on Entries', href: `/tournaments/${slugId}/records/rounds-on-entries` }, { label: label }]} />
      </div>
      <RoundOnEntriesFull params={{ id, title }} />
    </div>
  );
}
