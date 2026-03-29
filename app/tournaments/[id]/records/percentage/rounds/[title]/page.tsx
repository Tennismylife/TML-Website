import PercentageFull from '@/app/tournaments/[id]/records/percentage/_components/PercentageFull';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { makeTitle } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../../RecordsWebPageJsonLd';

export async function generateMetadata({ params }: { params: { id: string; title: string } }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Best winning percentage in ${getRoundFullName(String(title))}`;
  const titleText = makeTitle(label, tournamentName);
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

  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/percentage/rounds/${encodeURIComponent(String(title))}`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title: titleText,
    openGraph: {
      title: titleText,
      url: ogUrl,
      siteName: 'Tennis My Life',
      description: label,
      images: [{ url: ogImage, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title: titleText, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const label = `Best winning percentage in ${getRoundFullName(String(title))}`;
  const pageTitle = makeTitle(label, tournamentName);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${slugId}/records/percentage/rounds/${encodeURIComponent(String(title))}`;
  return (
    <div className="w-full mx-auto text-white relative">
      <RecordsWebPageJsonLd
        pageTitle={pageTitle}
        pageDescription={`${label} at ${tournamentName}`}
        canonical={canonical}
        keywords={`${tournamentName}, winning percentage, ${label}, tennis records`}
      />
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <PercentageFull id={id} section="rounds" title={title} />
    </div>
  );
}