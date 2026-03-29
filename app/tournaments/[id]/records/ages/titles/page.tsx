import React from 'react';
import TitlesClient from './TitlesClient';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { shouldIndexRecords } from '@/lib/getTournamentName';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  const title = `${tournamentName} Title Age Records | Tennis Records`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const ogImage = `${site}/og/site-preview.png`;
  const description = `Youngest and oldest title winners at ${tournamentName}. Age records for men's singles champions from the Open Era.`;

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
  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/ages/titles`;
  return {
    title,
    description,
    openGraph: { title, description, url: ogUrl, siteName: 'Tennis My Life', images: [{ url: ogImage, alt: `${tournamentName} - Title Age Records`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
    robots: { index: indexPage, follow: true },
  };
}

export default async function Page({ params }: any) {
  // params may be a Promise in this Next.js version; await it on the server
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const pageTitle = `${tournamentName} Title Age Records | Tennis Records`;
  const pageDescription = `Youngest and oldest title winners at ${tournamentName}. Age records for men's singles champions from the Open Era.`;
  const canonical = `${site}/tournaments/${slugId}/records/ages/titles`;

  // Render a server-side H1 so this page has an authoritative title like "{Tournament} | Title Age Records"
  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <RecordsWebPageJsonLd
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          canonical={canonical}
          keywords={`${tournamentName}, title age records, youngest champion, oldest champion, tennis records`}
        />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`${tournamentName} | Title Age Records`}</h1>
        <TitlesClient id={id} />
      </main>
    </div>
  );
}
