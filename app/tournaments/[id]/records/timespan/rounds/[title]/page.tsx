import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';
import { getTournamentName } from '@/lib/getTournamentName';
import { makeTitle } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const label = `Biggest timespan between 2 ${getRoundFullName(String(title))}`;
  const siteTitle = makeTitle(label, tournamentName);

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

  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/timespan/rounds/${title}`;
  return {
    title: siteTitle,
    openGraph: { title: siteTitle, url: ogUrl, siteName: 'TennisMyLife', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: siteTitle, images: [`${site}/og/site-preview.png`] },
    alternates: { canonical: ogUrl },
  };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <TimespanFull id={id} title={title} section="rounds" />
    </div>
  );
}
