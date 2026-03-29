import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, getTournamentSlug, shouldIndexRecords } from '@/lib/getTournamentName';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../RecordsWebPageJsonLd';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug
  let canonicalSlug = String(p.id);
  if (/^\d+$/.test(String(p.id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(p.id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true, category: true, years: true } });
      canonicalSlug = t?.slug ?? canonicalId;
      const tournamentName = await getTournamentName(p.id);
      const description = `The longest winning streaks in men's singles at ${tournamentName}. Historical streak records from Open Era editions.`;
      const siteTitle = `${tournamentName} Longest Winning Streaks | Tennis Records`;
      const ogUrl = `${site}/tournaments/${canonicalSlug}/records/streak`;
      return {
        title: siteTitle,
        description,
        openGraph: { title: siteTitle, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Longest Winning Streaks`, width: 1200, height: 630, type: 'image/png' }] },
        twitter: { card: 'summary_large_image', title: siteTitle, description, images: [`${site}/og/site-preview.png`] },
        alternates: { canonical: ogUrl },
        robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
      } as any;
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(p.id) }, select: { slug: true, category: true, years: true } });
    canonicalSlug = t?.slug ?? String(p.id);
    const tournamentName = await getTournamentName(p.id);
    const description = `The longest winning streaks in men's singles at ${tournamentName}. Historical streak records from Open Era editions.`;
    const siteTitle = `${tournamentName} Longest Winning Streaks | Tennis Records`;
    const ogUrl = `${site}/tournaments/${canonicalSlug}/records/streak`;
    return {
      title: siteTitle,
      description,
      openGraph: { title: siteTitle, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Longest Winning Streaks`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, description, images: [`${site}/og/site-preview.png`] },
      alternates: { canonical: ogUrl },
      robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
    } as any;
  }

  // Fallback (slug not resolved)
  const tournamentName = await getTournamentName(p.id);
  const description = `The longest winning streaks in men's singles at ${tournamentName}. Historical streak records from Open Era editions.`;
  const siteTitle = `${tournamentName} Longest Winning Streaks | Tennis Records`;
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/streak`;
  return {
    title: siteTitle,
    description,
    openGraph: { title: siteTitle, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Longest Winning Streaks`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: siteTitle, description, images: [`${site}/og/site-preview.png`] },
    alternates: { canonical: ogUrl },
  } as any;
} 

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Render a server-side H1 above the interactive client component so tests and crawlers
  // can see the page title immediately and so the heading is visible above the header.
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const pageTitle = `${tournamentName} Longest Winning Streaks | Tennis Records`;
  const pageDescription = `The longest winning streaks in men's singles at ${tournamentName}. Historical streak records from Open Era editions.`;
  const canonical = `${site}/tournaments/${slugId}/records/streak`;
  return (
    <main className="w-full mx-auto pt-0 pb-8 px-0 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
      <RecordsWebPageJsonLd
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        canonical={canonical}
        keywords={`${tournamentName}, winning streaks, longest streak, tennis records`}
      />
      <h1 className="relative z-50 mt-0 text-4xl md:text-5xl font-extrabold mb-6 text-center text-white">{`${tournamentName} Longest Winning Streaks`}</h1>
      <TournamentPage params={Promise.resolve({ id, tab: 'streak' })} />
    </main>
  );
}
