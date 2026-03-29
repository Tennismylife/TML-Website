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
  const title = `${tournamentName} Win Percentage Per Round | Tennis Records`;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const ogImage = `${site}/og/site-preview.png`;
  const description = `Win percentage per round in men's singles at ${tournamentName}. Discover which players dominate each stage of the draw. Open Era records.`;

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
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/percentage/rounds`;
  return {
    title,
    description,
    openGraph: { title, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - Win Percentage Per Round`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
    robots: { index: indexPage, follow: true },
  };
}

export default function Page({ params }: any) {
  const p = (React as any).use ? (React as any).use(params) : params;
  const { id } = p;
  // Ensure server renders an H1 for the percentage tab
  const page = async () => {
    const tournamentName = await getTournamentName(id);
    const slugId = await getTournamentSlug(id).catch(() => id);
    const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
    return (
      <>
        <RecordsWebPageJsonLd
          pageTitle={`${tournamentName} Win Percentage Per Round | Tennis Records`}
          pageDescription={`Win percentage per round in men's singles at ${tournamentName}. Discover which players dominate each stage of the draw. Open Era records.`}
          canonical={`${site}/tournaments/${slugId}/records/percentage/rounds`}
          keywords={`${tournamentName}, win percentage per round, tennis records, open era stats`}
        />
        <TournamentPage params={Promise.resolve({ id, tab: 'percentage' })} />
      </>
    );
  };
  return page() as any;
}