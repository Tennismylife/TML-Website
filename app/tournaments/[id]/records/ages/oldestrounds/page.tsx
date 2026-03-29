import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { shouldIndexRecords } from '@/lib/getTournamentName';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  const title = `Oldest Round Appearances at ${tournamentName} | Tennis Records`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const ogImage = `${site}/og/site-preview.png`;
  const description = `The oldest players ever to reach each round at ${tournamentName}. Age records per round from Open Era men's singles.`;

  let canonicalSlug = String(p.id);
  let indexPage = true;
  if (/^\d+$/.test(String(p.id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(p.id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true, category: true, years: true } });
      canonicalSlug = t?.slug ?? canonicalId;
      indexPage = shouldIndexRecords(t?.category, t?.years ?? null);
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(p.id) }, select: { slug: true, category: true, years: true } });
    canonicalSlug = t?.slug ?? String(p.id);
    indexPage = shouldIndexRecords(t?.category, t?.years ?? null);
  }
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/ages/oldestrounds`;
  return {
    title,
    description,
    openGraph: { title, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - Oldest Round Appearances`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
    robots: { index: indexPage, follow: true },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const pageTitle = `Oldest Round Appearances at ${tournamentName} | Tennis Records`;
  const pageDescription = `The oldest players ever to reach each round at ${tournamentName}. Age records per round from Open Era men's singles.`;
  const canonical = `${site}/tournaments/${slugId}/records/ages/oldestrounds`;

  // Render a server-side H1 for the Oldest per-round overview
  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <RecordsWebPageJsonLd
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          canonical={canonical}
          keywords={`${tournamentName}, oldest players, age records, rounds, tennis records`}
        />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Oldest per Round at ${tournamentName}`}</h1>
        {/* Pass tab so the client renders the AgesSection in the correct subtab */}
        {/* @ts-ignore - TournamentPage is a client component */}
        <TournamentPage params={Promise.resolve({ id, tab: 'ages' })} />
      </main>
    </div>
  );
}