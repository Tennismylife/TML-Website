import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import { redirect, permanentRedirect } from 'next/navigation';
import { getPlayerHref } from '@/lib/utils';
import RankingNarrativeServer from './Ranking/RankingNarrativeServer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: any) {
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
  // Build canonical following the actual requested URL: prefer self-referencing canonical
  // If a ?tab query param is present we include the tab path and relevant query params.
  const resolvedSearchParamsForMeta = await searchParams;
  const defaultTab = resolvedSearchParamsForMeta?.tab || 'matches';
  const resolvedQuery: Record<string, any> = resolvedSearchParamsForMeta instanceof URLSearchParams ? Object.fromEntries(resolvedSearchParamsForMeta.entries()) : resolvedSearchParamsForMeta || {};
  const hasFilters = Object.entries(resolvedQuery).some(([k, v]) => k !== 'tab' && v != null && String(v) !== '' && String(v) !== 'All');

  let canonical = `${site}/players/${slug}`;
  if (defaultTab) {
    canonical = `${canonical}/${defaultTab}`;
  }
  if (defaultTab === 'matches' && hasFilters) {
    const entries = Object.entries(resolvedQuery)
      .filter(([k, v]) => k !== 'tab' && v != null && String(v) !== '' && String(v) !== 'All')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (entries.length) canonical = `${canonical}?${entries.join('&')}`;
  }

  // If accessed via ?tab= query param, tell Google not to index this URL
  // (the canonical clean URL /players/slug/tab is the one that should be indexed)
  const hasTabQueryParam = Boolean(resolvedQuery?.tab);

  return {
    title: `${name} | Tennis Statistics, Match Results & Rankings`,
    openGraph: { url: canonical },
    alternates: { canonical },
    ...(hasTabQueryParam && { robots: { index: false, follow: true } }),
  };
}

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = await params;
  if (!slugParam) return <div>Player ID not provided</div>;

  // searchParams can be a Promise — await it before accessing properties
  const resolvedSearchParams = await searchParams;
  // If a ?tab query param is present, prefer to render that tab inline without redirecting.
  // Default tab when missing is 'matches' (maintains previous UX without redirect).
  const hasTab = Boolean(resolvedSearchParams && Object.prototype.hasOwnProperty.call(resolvedSearchParams, 'tab'));
  const tabValue = resolvedSearchParams?.tab || 'matches';
  const isSlug = !/^\d+$/.test(String(slugParam)); // treat any non-all-digits as slug

  // PLAYER: support both slug and numeric ID. Additionally, if an incoming legacy code slug (e.g. H377)
  // does not match a player, consult the /api/slug-map to resolve a canonical slug and use that without redirecting.
  let player: any = null;
  if (!isSlug) {
    player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true } });
  } else {
    const slugLower = String(slugParam).toLowerCase();
    player = await prisma.player.findUnique({ where: { slug: slugLower }, select: { id: true, player: true, atpname: true, slug: true } });

    // If not found, try slug-map lookup (legacy codes map to canonical slugs)
    if (!player) {
      try {
        const apiUrl = 'https://stats.tennismylife.org/api/slug-map';
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
        if (apiResp.ok) {
          const maps = await apiResp.json();
          const mapped = maps?.players?.[String(slugParam).toUpperCase()];
          if (mapped) {
            player = await prisma.player.findUnique({ where: { slug: mapped }, select: { id: true, player: true, atpname: true, slug: true } });
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (!player) return <div>Player not found: {slugParam}</div>;

  // If ?tab= is present, permanently redirect (308) to the clean path-based URL.
  // This ensures ?tab= is never visible to users or Google, and Google updates its index.
  if (hasTab && tabValue) {
    const remainingParams = new URLSearchParams();
    const resolvedQuery: Record<string, any> = resolvedSearchParams instanceof URLSearchParams
      ? Object.fromEntries(resolvedSearchParams.entries())
      : resolvedSearchParams || {};
    for (const [k, v] of Object.entries(resolvedQuery)) {
      if (k !== 'tab' && v != null && String(v) !== '') {
        remainingParams.set(k, String(v));
      }
    }
    const qs = remainingParams.toString();
    const cleanUrl = `/players/${player.slug}/${tabValue}${qs ? `?${qs}` : ''}`;
    permanentRedirect(cleanUrl);
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

      <PlayerClient
        params={{ id: player.id, tab: tabValue }}
        initialPlayer={player}
        rankingNarrative={
          <RankingNarrativeServer
            playerId={player.id}
            birthdate={player.birthdate ? String(player.birthdate) : null}
            playerName={player.atpname || player.player}
            className="mb-8"
          />
        }
      />
    </>
  );
}
