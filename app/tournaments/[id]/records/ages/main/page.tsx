import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, getTournamentSlug, shouldIndexRecords } from '@/lib/getTournamentName';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';
import RecordsBreadcrumb from '../../RecordsBreadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';

  let canonicalSlug = String(p.id);
  let tournamentCategory: any = null;
  let tournamentYears: any = null;
  if (/^\d+$/.test(String(p.id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(p.id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true, category: true, years: true } });
      canonicalSlug = t?.slug ?? canonicalId;
      tournamentCategory = t?.category;
      tournamentYears = t?.years ?? null;
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(p.id) }, select: { slug: true, category: true, years: true } });
    canonicalSlug = t?.slug ?? String(p.id);
    tournamentCategory = t?.category;
    tournamentYears = t?.years ?? null;
  }

  const title = `${tournamentName} Age Records | Tennis My Life`;
  const description = `Youngest and oldest players in the men's singles main draw at ${tournamentName}. Historical age records across all Open Era editions.`;
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/ages/main`;
  const ogImage = `${site}/og/site-preview.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: ogUrl,
      siteName: 'Tennis My Life',
      images: [{ url: ogImage, alt: `${tournamentName} - Age Records`, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
    robots: {
      index: shouldIndexRecords(tournamentCategory, tournamentYears),
      follow: true,
    },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${slugId}/records/ages/main`;
  const pageTitle = `${tournamentName} Age Records | Tennis My Life`;
  const pageDescription = `Youngest and oldest players in the men's singles main draw at ${tournamentName}. Historical age records across all Open Era editions.`;

  // Render a server-side H1 so this page has an authoritative title like "{tournamentName} | Ages"
  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <RecordsWebPageJsonLd
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          canonical={canonical}
          keywords={`${tournamentName}, age records, youngest players, oldest players, tennis records`}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Age Records', item: canonical }] }) }} />
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Age Records' }]} className="px-2" />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`${tournamentName} Age Records`}</h1>
        {/* Render the full Tournament records page (client) so the page includes header, tabs and the AgesSection */}
        {/* Pass params as a resolved promise so the client component receives the same shape it expects */}
        {/* @ts-ignore - TournamentPage is a client component */}
        <TournamentPage params={Promise.resolve({ id, tab: 'ages' })} />
      </main>
    </div>
  );
}
