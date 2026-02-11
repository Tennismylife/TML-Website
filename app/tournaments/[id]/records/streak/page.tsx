import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName } from '@/lib/recordMetadata';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug
  let canonicalSlug = String(p.id);
  if (/^\d+$/.test(String(p.id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(p.id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true } });
      canonicalSlug = t?.slug ?? canonicalId;
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(p.id) }, select: { slug: true } });
    canonicalSlug = t?.slug ?? String(p.id);
  }

  const tournamentName = await getTournamentName(p.id);
  // Title required by product: "{[Tournament Name]} Longest Winning Streaks | Tennis Records"
  const siteTitle = `${tournamentName} Longest Winning Streaks | Tennis Records`;
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/streak`;
  return {
    title: siteTitle,
    openGraph: { title: siteTitle, url: ogUrl, siteName: 'TennisMyLife', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Longest Winning Streaks`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: siteTitle, images: [`${site}/og/site-preview.png`] },
    alternates: { canonical: ogUrl },
  } as any;
} 

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Render a server-side H1 above the interactive client component so tests and crawlers
  // can see the page title immediately and so the heading is visible above the header.
  const tournamentName = await getTournamentName(id);
  return (
    <main className="w-full mx-auto pt-0 pb-8 px-0 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
      <h1 className="relative z-50 mt-0 text-4xl md:text-5xl font-extrabold mb-6 text-center text-white">{`${tournamentName} Longest Winning Streaks`}</h1>
      <TournamentPage params={Promise.resolve({ id, tab: 'streak' })} />
    </main>
  );
}
