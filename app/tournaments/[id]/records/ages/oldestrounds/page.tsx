import React from 'react';
import RecordsPageClient from '@/app/tournaments/[id]/records/RecordsClient';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { shouldIndexRecords } from '@/lib/getTournamentName';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';
import RecordsBreadcrumb from '../../RecordsBreadcrumb';

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

  // SSR data fetch for ages/oldestrounds table
  let agesData: any;
  try {
    const res = await fetch(`${site}/api/tournaments/${id}/records/ages/oldestrounds`, { cache: 'no-store' });
    if (res.ok) agesData = await res.json();
  } catch { /* fall back to client-side fetch */ }

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Ages', item: `${site}/tournaments/${slugId}/records/ages/main` }, { '@type': 'ListItem', position: 6, name: 'Oldest by Round', item: canonical }] }) }} />
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Ages', href: `/tournaments/${slugId}/records/ages/main` }, { label: 'Oldest by Round' }]} className="px-2" />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Oldest per Round at ${tournamentName}`}</h1>
        {/* Pass tab so the client renders the AgesSection in the correct subtab */}
        <RecordsPageClient
          params={Promise.resolve({ id, tab: 'ages' })}
          initialTournament={{ id, slug: slugId, name: tournamentName }}
          initialPathId={slugId}
          initialActiveTab="ages"
          initialAgeSubTab="oldestrounds"
          initialAgesData={agesData}
        />
      </main>
    </div>
  );
}
