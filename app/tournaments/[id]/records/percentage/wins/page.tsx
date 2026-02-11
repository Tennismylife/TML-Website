import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  const title = `Best Winning Percentage at ${tournamentName}`;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${p.id}/records/percentage/wins`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title,
    openGraph: {
      title,
      url: ogUrl,
      siteName: 'Tennis My Life',
      description: `Best winning percentage at ${tournamentName}`,
      images: [{ url: ogImage, alt: `${tournamentName} - Best Winning Percentage`, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Ensure server renders an H1 for the percentage tab
  return <TournamentPage params={Promise.resolve({ id, tab: 'percentage' })} />;
}