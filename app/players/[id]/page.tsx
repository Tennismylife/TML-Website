import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';
import { getPlayerHref } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: any) {
  // params might be a Promise in this Next.js version, match page behavior
  const { id: slugParam } = await params;
  if (!slugParam) return { title: 'Player | Tennis Statistics, Match Results & Rankings' };

  const isSlug = !/^\d+$/.test(String(slugParam));
  let player: any = null;
  try {
    if (!isSlug) {
      player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { atpname: true, player: true, slug: true } });
    } else {
      const slugLower = String(slugParam).toLowerCase();
      player = await prisma.player.findUnique({ where: { slug: slugLower }, select: { atpname: true, player: true, slug: true } });
    }
  } catch (e) {
    // ignore
  }

  const name = player ? (player.atpname || player.player) : String(slugParam);
  const slug = player?.slug || String(slugParam);
  const site = 'https://stats.tennismylife.org';
  const ogUrl = `${site}/players/${slug}`;
  return {
    title: `${name} | Tennis Statistics, Match Results & Rankings`,
    openGraph: { url: ogUrl },
    alternates: { canonical: ogUrl },
  }; 
}

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = await params;
  if (!slugParam) return <div>Player ID not provided</div>;

  // searchParams can be a Promise — await it before accessing properties
  const resolvedSearchParams = await searchParams;
  const tabValue = resolvedSearchParams?.tab || 'overview';
  const isSlug = !/^\d+$/.test(String(slugParam)); // treat any non-all-digits as slug

  // PLAYER
  const player = !isSlug
    ? await prisma.player.findUnique({
        where: { id: String(slugParam) },
        select: { id: true, player: true, atpname: true, slug: true },
      })
    : await prisma.player.findUnique({
        where: { slug: String(slugParam).toLowerCase() },
        select: { id: true, player: true, atpname: true, slug: true },
      });

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Redirect ID → slug
  if (!isSlug && player.slug) {
    const search = tabValue !== 'overview' ? `?tab=${tabValue}` : '';
    redirect(`${getPlayerHref(player.slug)}${search}`);
  }

  const name = player.atpname || player.player;

  // MATCHES
  const allMatches = await prisma.match.findMany({
    where: {
      OR: [{ winner_id: player.id }, { loser_id: player.id }],
      status: true,
    },
  });

  const totalMatches = allMatches.length;
  const careerWins = allMatches.filter(m => m.winner_id === player.id).length;
  const careerLosses = totalMatches - careerWins;

  const winsBySurface = (s: string) =>
    allMatches.filter(m => m.winner_id === player.id && m.surface === s).length;
  const lossesBySurface = (s: string) =>
    allMatches.filter(m => m.loser_id === player.id && m.surface === s).length;

  const clayWins = winsBySurface('Clay');
  const hardWins = winsBySurface('Hard');
  const grassWins = winsBySurface('Grass');

  const clayLosses = lossesBySurface('Clay');
  const hardLosses = lossesBySurface('Hard');
  const grassLosses = lossesBySurface('Grass');

  const winRate = (w: number, l: number) =>
    w + l > 0 ? Number(((w / (w + l)) * 100).toFixed(2)) : 0;

  // TITLES
  const titlesByTourney: Record<string, number> = {};
  const titlesByLevel: Record<string, number> = {};

  allMatches
    .filter(m => m.winner_id === player.id && m.round === 'F')
    .forEach(m => {
      const tn = m.tourney_name ?? '';
      titlesByTourney[tn] = (titlesByTourney[tn] || 0) + 1;
      const lvl = m.tourney_level ?? '';
      titlesByLevel[lvl] = (titlesByLevel[lvl] || 0) + 1;
    });

  const siteUrl = 'https://stats.tennismylife.org';
  const url = `${siteUrl}/players/${player.slug}`;

  // =========================
  // JSON-LD: ATHLETE (ENTITY)
  // =========================
  const athleteLd = {
    '@context': 'https://schema.org',
    '@type': 'Athlete',
    name,
    sport: 'Tennis',
    url,
    mainEntityOfPage: url,
    description: `Professional tennis player profile of ${name}.`,
    memberOf: {
      '@type': 'Organization',
      name: 'ATP Tour',
      url: 'https://www.atptour.com',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Career Wins', value: careerWins },
      { '@type': 'PropertyValue', name: 'Career Losses', value: careerLosses },
      { '@type': 'PropertyValue', name: 'Clay Wins', value: clayWins },
      { '@type': 'PropertyValue', name: 'Hard Wins', value: hardWins },
      { '@type': 'PropertyValue', name: 'Grass Wins', value: grassWins },
      { '@type': 'PropertyValue', name: 'Clay Win %', value: winRate(clayWins, clayLosses) },
      { '@type': 'PropertyValue', name: 'Hard Win %', value: winRate(hardWins, hardLosses) },
      { '@type': 'PropertyValue', name: 'Grass Win %', value: winRate(grassWins, grassLosses) },
      { '@type': 'PropertyValue', name: 'Career Titles', value: Object.values(titlesByTourney).reduce((a, b) => a + b, 0) },
      ...Object.entries(titlesByLevel).map(([lvl, count]) => ({
        '@type': 'PropertyValue',
        name:
          lvl === 'G'
            ? 'Grand Slam Titles'
            : lvl === 'M'
            ? 'Masters Titles'
            : lvl,
        value: count,
      })),
      ...Object.entries(titlesByTourney).map(([t, c]) => ({
        '@type': 'PropertyValue',
        name: `${t} Titles`,
        value: c,
      })),
    ],
    sameAs: [url],
  };

  // =========================
  // JSON-LD: BREADCRUMB (RICH RESULT)
  // =========================
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Players',
        item: `${siteUrl}/players`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: url,
      },
    ],
  };

  return (
    <>
      {/* ENTITY SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(athleteLd) }}
      />

      {/* RICH RESULT */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <PlayerClient params={{ id: player.id, tab: tabValue }} />
    </>
  );
}
