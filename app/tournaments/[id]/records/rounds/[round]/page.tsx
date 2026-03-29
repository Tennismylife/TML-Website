import RoundFull from '../_components/RoundFull';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { shouldIndexRecords } from '@/lib/getTournamentName';
import { makeTitle, humanize } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import { getRoundFullName } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';

export async function generateMetadata({ params }: { params: Promise<{ id: string; round: string }> }) {
  const { id, round } = await params;
  const tournamentName = await getTournamentName(id);
  // Use human-friendly round name + 'Appearances' and prefix 'Most' so makeTitle does not insert 'the' before tournament name
  const label = `Most ${getRoundFullName(String(round))} Appearances`;
  const titleText = makeTitle(label, tournamentName);
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug (prefer slug for URLs)
  let canonicalSlug = String(id);
  if (/^\d+$/.test(String(id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true, category: true, years: true } });
      canonicalSlug = t?.slug ?? canonicalId;
      const description = `Players with the most ${getRoundFullName(String(round))} appearances at ${tournamentName}. Open Era records from all editions.`;
      const ogUrl = `${site}/tournaments/${canonicalSlug}/records/rounds/${encodeURIComponent(String(round))}`;
      const ogImage = `${site}/og/site-preview.png`;
      return {
        title: titleText,
        description,
        openGraph: { title: titleText, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }] },
        twitter: { card: 'summary_large_image', title: titleText, description, images: [ogImage] },
        alternates: { canonical: ogUrl },
        robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
      };
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(id) }, select: { slug: true, category: true, years: true } });
    canonicalSlug = t?.slug ?? String(id);
    const description = `Players with the most ${getRoundFullName(String(round))} appearances at ${tournamentName}. Open Era records from all editions.`;
    const ogUrl = `${site}/tournaments/${canonicalSlug}/records/rounds/${encodeURIComponent(String(round))}`;
    const ogImage = `${site}/og/site-preview.png`;
    return {
      title: titleText,
      description,
      openGraph: { title: titleText, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: titleText, description, images: [ogImage] },
      alternates: { canonical: ogUrl },
      robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
    };
  }

  // Fallback (slug not resolved)
  const description = `Players with the most ${getRoundFullName(String(round))} appearances at ${tournamentName}. Open Era records from all editions.`;
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/rounds/${encodeURIComponent(String(round))}`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title: titleText,
    description,
    openGraph: { title: titleText, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: titleText, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string; round: string }> }) {
  const { id, round } = await params;
  console.log('Rendering rounds page for id:', id, 'round:', round);
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  const slugId = await getTournamentSlug(id).catch(() => id);
  try {
    tournamentName = await getTournamentName(id);
  } catch (e) {
    console.log('Error getting tournament name:', e);
  }
  const roundName = getRoundFullName(String(round));
  const label = `Most ${roundName} Appearances at ${tournamentName}`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${slugId}/records/rounds/${encodeURIComponent(String(round))}`;
  const pageDescription = `Players with the most ${roundName} appearances at ${tournamentName}. Open Era records from all editions.`;

  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <RecordsWebPageJsonLd
          pageTitle={`${label} | Tennis Records`}
          pageDescription={pageDescription}
          canonical={canonical}
          keywords={`${tournamentName}, ${roundName}, round appearances, tennis records`}
        />
        <ViewRecordsCTA id={id} />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{label}</h1>
        <RoundFull id={id} round={round} />
      </main>
    </div>
  );
}
