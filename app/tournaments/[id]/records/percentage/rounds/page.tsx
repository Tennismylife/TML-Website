import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName } from '@/lib/getTournamentName';
import { makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  const title = makeTitle('Win Percentage Per Round', tournamentName);
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${p.id}/records/percentage/rounds`;
  const ogImage = `${site}/og/site-preview.png`;
  return {
    title,
    openGraph: { title, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - Win Percentage Per Round`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default function Page({ params }: any) {
  const p = (React as any).use ? (React as any).use(params) : params;
  const { id } = p;
  // Ensure server renders an H1 for the percentage tab
  return <TournamentPage params={Promise.resolve({ id, tab: 'percentage' })} />;
}