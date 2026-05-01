import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { prisma } from '../../../lib/prisma';
import { redirect, permanentRedirect } from 'next/navigation';
import { getPlayerHref, IOC_TO_ISO } from '@/lib/utils';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import RankingNarrativeServer from './Ranking/RankingNarrativeServer';
import OverviewServer from './OverviewServer';
import { getPlayerLandingRobots } from './playerIndexing';

const PlayerClient = dynamic(() => import('./PlayerClient'), {
  loading: () => <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">Loading player data...</div>,
});

export const revalidate = false; // cache infinita — rivalidare via /api/revalidate dopo import DB

export async function generateStaticParams() {
  try {
    const latestRankingDate = await prisma.rankingDate.findFirst({
      orderBy: { date: 'desc' },
      select: { id: true },
    });

    if (!latestRankingDate) return [];

    const rows = await prisma.ranking.findMany({
      where: {
        rankingDateId: latestRankingDate.id,
        rank: { lte: 100 },
      },
      orderBy: { rank: 'asc' },
      select: {
        playerId: true,
        player: { select: { slug: true } },
      },
    });

    const seen = new Set<string>();
    const params: Array<{ id: string }> = [];

    for (const row of rows) {
      const id = row.player?.slug || String(row.playerId);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      params.push({ id });
    }

    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: any) {
  // params might be a Promise in this Next.js version, match page behavior
  const { id: slugParam } = await params;
  if (!slugParam) return { title: 'Player | Tennis Statistics, Match Results & Rankings' };

  const isSlug = !/^\d+$/.test(String(slugParam));
  let player: any = null;
  try {
    if (!isSlug) {
      player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, atpname: true, player: true, slug: true } });
    } else {
      const slugLower = String(slugParam).toLowerCase();
      player = await prisma.player.findUnique({ where: { slug: slugLower }, select: { id: true, atpname: true, player: true, slug: true } });
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
  const defaultTab = resolvedSearchParamsForMeta?.tab || 'overview';
  const resolvedQuery: Record<string, any> = resolvedSearchParamsForMeta instanceof URLSearchParams ? Object.fromEntries(resolvedSearchParamsForMeta.entries()) : resolvedSearchParamsForMeta || {};
  const hasFilters = Object.entries(resolvedQuery).some(([k, v]) => k !== 'tab' && v != null && String(v) !== '' && String(v) !== 'All');

  let canonical = `${site}/players/${slug}`;
  // For 'overview', canonical is the base /players/slug URL (no tab segment)
  if (defaultTab && defaultTab !== 'overview') {
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

  let playerDescription = `${name} tennis statistics: career win-loss record, match results, ATP rankings, surface stats, head-to-head and tournament history on TennisMyLife.`;
  if (player?.id) {
    try {
      const [totalMatches, careerWins, totalTitles] = await Promise.all([
        prisma.match.count({
          where: {
            status: true,
            OR: [{ winner_id: String(player.id) }, { loser_id: String(player.id) }],
          },
        }),
        prisma.match.count({ where: { status: true, winner_id: String(player.id) } }),
        prisma.match.count({
          where: {
            winner_id: String(player.id),
            round: 'F',
            NOT: [
              { tourney_name: { contains: 'next gen', mode: 'insensitive' } },
              { score: { contains: 'WEA' } },
            ],
            OR: [
              { status: true },
              { score: { contains: 'W/O', mode: 'insensitive' } },
            ],
          },
        }),
      ]);
      if (totalMatches > 0) {
        const careerLosses = totalMatches - careerWins;
        const winPct = ((careerWins / totalMatches) * 100).toFixed(1);
        playerDescription = `${name} ATP stats: ${careerWins}-${careerLosses} career record (${winPct}% win rate), ${totalTitles} titles, rankings history, match results, surface performance and head-to-head data on TennisMyLife.`;
      }
    } catch {
      // fallback to static description
    }
  }
  const imageUrl = `${site}/og/${encodeURIComponent(slug)}.png`;
  const nameParts = name.split(/\s+/).filter(Boolean);
  const ogFirstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] ?? '');
  const ogLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const metaKeywords = [
    `${name} tennis`,
    `${name} statistics`,
    `${name} ATP`,
    `${name} career stats`,
    `${name} match results`,
    `${name} rankings`,
    `${name} surface stats`,
    `${name} head to head`,
    `${name} win loss record`,
    'tennis player statistics',
  ];
  const pageTitle = `${name} – Stats, Matches, Results, Records & Rankings | TennisMyLife`;
  const robots = hasTabQueryParam
    ? { index: false, follow: true }
    : await getPlayerLandingRobots(String(slugParam));

  return {
    title: pageTitle,
    description: playerDescription,
    authors: [{ name: 'TennisMyLife' }],
    keywords: metaKeywords,
    openGraph: {
      url: canonical,
      type: 'profile',
      firstName: ogFirstName,
      lastName: ogLastName,
      username: slug,
      siteName: 'TennisMyLife',
      title: pageTitle,
      description: playerDescription,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${name} tennis statistics` }],
    },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: pageTitle, description: playerDescription, images: [imageUrl] },
    alternates: { canonical },
    robots,
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
  const tabValue = resolvedSearchParams?.tab || 'overview';
  const isSlug = !/^\d+$/.test(String(slugParam)); // treat any non-all-digits as slug

  // PLAYER: support both slug and numeric ID. Additionally, if an incoming legacy code slug (e.g. H377)
  // does not match a player, consult the /api/slug-map to resolve a canonical slug and use that without redirecting.
  let player: any = null;
  const playerSelect = { id: true, player: true, atpname: true, slug: true, birthdate: true, hand: true, backhand: true, height: true, weight: true, turnedpro: true, coaches: true, ioc: true, birthplace: true };
  if (!isSlug) {
    player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: playerSelect });
  } else {
    const slugLower = String(slugParam).toLowerCase();
    player = await prisma.player.findUnique({ where: { slug: slugLower }, select: playerSelect });

    // If not found, try slug-map lookup (legacy codes map to canonical slugs)
    if (!player) {
      try {
        const apiUrl = 'https://stats.tennismylife.org/api/slug-map';
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
        if (apiResp.ok) {
          const maps = await apiResp.json();
          const mapped = maps?.players?.[String(slugParam).toUpperCase()];
          if (mapped) {
            player = await prisma.player.findUnique({ where: { slug: mapped }, select: playerSelect });
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (!player) return <div>Player not found: {slugParam}</div>;

  const landingRobots = await getPlayerLandingRobots(String(slugParam));
  if (!hasTab && !landingRobots.index) {
    permanentRedirect('/');
  }

  const resolvedQuery: Record<string, any> = resolvedSearchParams instanceof URLSearchParams
    ? Object.fromEntries(resolvedSearchParams.entries())
    : resolvedSearchParams || {};

  const hasLandingQueryParams = Object.keys(resolvedQuery).some((key) =>
    key !== 'tab' && resolvedQuery[key] != null && String(resolvedQuery[key]) !== ''
  );

  if (!hasTab && hasLandingQueryParams) {
    permanentRedirect(`/players/${player.slug}`);
  }

  // Redirect to canonical slug URL: handles numeric IDs, legacy codes (e.g. P0FU) and case mismatches.
  if (player.slug && !hasTab && String(slugParam) !== player.slug) {
    const remainingParams = new URLSearchParams();
    for (const [k, v] of Object.entries(resolvedQuery)) {
      if (k !== 'tab' && v != null && String(v) !== '') {
        remainingParams.set(k, String(v));
      }
    }
    const qs = remainingParams.toString();
    permanentRedirect(`/players/${player.slug}${qs ? `?${qs}` : ''}`);
  }

  // If ?tab= is present, permanently redirect (308) to the clean path-based URL.
  // This ensures ?tab= is never visible to users or Google, and Google updates its index.
  if (hasTab && tabValue) {
    const remainingParams = new URLSearchParams();
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
    select: {
      winner_id: true,
      loser_id: true,
      winner_rank: true,
      loser_rank: true,
      year: true,
      surface: true,
      round: true,
      tourney_name: true,
      tourney_level: true,
      score: true,
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

  const careerWinRate = winRate(careerWins, careerLosses);
  const hardRate = winRate(hardWins, hardLosses);
  const clayRate = winRate(clayWins, clayLosses);
  const grassRate = winRate(grassWins, grassLosses);

  const surfaceStats = [
    { label: 'Hard', wins: hardWins, losses: hardLosses, rate: hardRate },
    { label: 'Clay', wins: clayWins, losses: clayLosses, rate: clayRate },
    { label: 'Grass', wins: grassWins, losses: grassLosses, rate: grassRate },
  ].filter((s) => s.wins + s.losses > 0);
  const bestSurface = surfaceStats.sort((a, b) => b.rate - a.rate)[0] ?? null;

  const top10Matches = allMatches.filter((m) => {
    const isWinner = m.winner_id === player.id;
    const oppRank = isWinner ? m.loser_rank : m.winner_rank;
    return oppRank != null && Number(oppRank) <= 10;
  });
  const top10Wins = top10Matches.filter((m) => m.winner_id === player.id).length;
  const top10Losses = top10Matches.length - top10Wins;

  const yearlyWins = new Map<number, { wins: number; total: number }>();
  for (const m of allMatches) {
    const y = m.year ? Number(m.year) : 0;
    if (!y) continue;
    const curr = yearlyWins.get(y) ?? { wins: 0, total: 0 };
    curr.total += 1;
    if (m.winner_id === player.id) curr.wins += 1;
    yearlyWins.set(y, curr);
  }
  let bestYear: number | null = null;
  let bestYearWins = 0;
  let bestYearTotal = 0;
  for (const [year, rec] of yearlyWins.entries()) {
    if (rec.total >= 5 && rec.wins > bestYearWins) {
      bestYear = year;
      bestYearWins = rec.wins;
      bestYearTotal = rec.total;
    }
  }

  const updatedDateIso = new Date().toISOString().split('T')[0];

  // TITLES
  const titlesByTourney: Record<string, number> = {};
  const titlesByLevel: Record<string, number> = {};

  allMatches
    .filter(m => m.winner_id === player.id && m.round === 'F' && !String(m.tourney_name ?? '').toLowerCase().includes('next gen') && !(m.score && String(m.score).includes('WEA')))
    .forEach(m => {
      const tn = m.tourney_name ?? '';
      titlesByTourney[tn] = (titlesByTourney[tn] || 0) + 1;
      const lvl = m.tourney_level ?? '';
      titlesByLevel[lvl] = (titlesByLevel[lvl] || 0) + 1;
    });

  const siteUrl = 'https://stats.tennismylife.org';
  const url = `${siteUrl}/players/${player.slug}`;
  const nameForWiki = name.replace(/\s+/g, '_');
  const overviewDescription = `${name} tennis statistics: career win-loss record, match results, ATP rankings, surface stats, head-to-head and tournament history on TennisMyLife.`;

  // Register country names
  try { countries.registerLocale(enLocale as any); } catch {}

  const ioc = player.ioc ?? '';
  const iso = (ioc && IOC_TO_ISO[ioc.toUpperCase()]) || undefined;
  const countryName = iso ? countries.getName(iso, 'en') : undefined;

  const nameParts = name.split(/\s+/).filter(Boolean);
  const givenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] ?? '');
  const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const biographicalProps: any[] = [];
  if (player.height) biographicalProps.push({ '@type': 'PropertyValue', name: 'Height', value: Number(player.height), unitCode: 'CMT', unitText: 'cm' });
  if (player.weight) biographicalProps.push({ '@type': 'PropertyValue', name: 'Weight', value: Number(player.weight), unitCode: 'KGM', unitText: 'kg' });
  if (player.hand) {
    const handMap: Record<string, string> = { R: 'Right-handed', L: 'Left-handed' };
    biographicalProps.push({ '@type': 'PropertyValue', name: 'Playing Hand', value: handMap[player.hand] ?? player.hand });
  }
  if (player.backhand) {
    const bhMap: Record<string, string> = { '1H': 'One-handed backhand', '1': 'One-handed backhand', '2H': 'Two-handed backhand', '2': 'Two-handed backhand' };
    biographicalProps.push({ '@type': 'PropertyValue', name: 'Backhand', value: bhMap[player.backhand] ?? player.backhand });
  }
  if (player.turnedpro) biographicalProps.push({ '@type': 'PropertyValue', name: 'Turned Pro', value: Number(player.turnedpro) });
  if (player.coaches) biographicalProps.push({ '@type': 'PropertyValue', name: 'Coach', value: String(player.coaches) });

  const pageKeywords = `${name} tennis, ${name} statistics, ${name} ATP, ${name} career stats, ${name} match results, ${name} rankings, ${name} surface stats, ${name} head to head, ${name} win loss record, tennis player statistics`;

  // =========================
  // JSON-LD: ATHLETE (ENTITY)
  // =========================
  const ogImage = `${siteUrl}/og/${encodeURIComponent(player.slug)}.png`;
  
  // Build award list for JSON-LD (Grand Slams, Masters, top tournaments)
  const awardList: string[] = [];
  const grandSlamCount = titlesByLevel['G'] ?? 0;
  if (grandSlamCount > 0) awardList.push(`${grandSlamCount} Grand Slam title${grandSlamCount > 1 ? 's' : ''}`);
  const mastersCount = titlesByLevel['M'] ?? 0;
  if (mastersCount > 0) awardList.push(`${mastersCount} Masters 1000 title${mastersCount > 1 ? 's' : ''}`);
  const topTourneyEntries = Object.entries(titlesByTourney).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, c]) => c > 0);
  for (const [t, c] of topTourneyEntries) {
    awardList.push(`${c} × ${t}`);
  }

  const athleteLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Athlete',
    '@id': `${url}#person`,
    name,
    givenName,
    familyName,
    sport: 'Tennis',
    url,
    mainEntityOfPage: url,
    image: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 },
    description: overviewDescription,
    ...(player.birthdate ? { birthDate: player.birthdate instanceof Date ? (player.birthdate as Date).toISOString().split('T')[0] : String(player.birthdate) } : {}),
    ...(player.birthplace ? { birthPlace: { '@type': 'Place', name: String(player.birthplace) } } : {}),
    ...(countryName ? { nationality: { '@type': 'Country', name: countryName } } : {}),
    memberOf: {
      '@type': 'Organization',
      name: 'ATP Tour',
      url: 'https://www.atptour.com',
    },
    additionalProperty: [
      ...biographicalProps,
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
    ...(awardList.length ? { award: awardList } : {}),
    sameAs: [
      `https://en.wikipedia.org/wiki/${encodeURIComponent(nameForWiki)}`,
      `https://www.atptour.com/en/players/${encodeURIComponent(player.slug)}/${String(player.id).toLowerCase()}/overview`,
    ],
  };

  // =========================
  // JSON-LD: WEBPAGE
  // =========================
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${name} | Tennis Statistics, Match Results & Rankings`,
    description: overviewDescription,
    url,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: 'TennisMyLife', url: siteUrl },
    mainEntity: { '@id': `${url}#person` },
    about: [{ '@id': `${url}#person` }],
    primaryImageOfPage: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 },
    keywords: pageKeywords,
    dateModified: new Date().toISOString(),
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
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: url,
      },
    ],
  };

  // =========================
  // JSON-LD: FAQ
  // =========================
  const totalTitles = Object.values(titlesByTourney).reduce((a: number, b: number) => a + b, 0);
  const grandSlamTitles = titlesByLevel['G'] ?? 0;
  const mastersTitles = titlesByLevel['M'] ?? 0;

  const faqItems: Array<{ q: string; a: string }> = [];

  // Q1: career record
  if (totalMatches > 0) {
    faqItems.push({
      q: `What is ${name}'s career win-loss record?`,
      a: `${name} has a career record of ${careerWins}–${careerLosses} across ${totalMatches} ATP matches, for a win rate of ${winRate(careerWins, careerLosses).toFixed(1)}%.`,
    });
  }

  // Q2: titles
  {
    const titleBreakdown: string[] = [];
    if (grandSlamTitles > 0) titleBreakdown.push(`${grandSlamTitles} Grand Slam title${grandSlamTitles > 1 ? 's' : ''}`);
    if (mastersTitles > 0) titleBreakdown.push(`${mastersTitles} Masters 1000 title${mastersTitles > 1 ? 's' : ''}`);
    const titleAnswer =
      totalTitles === 0
        ? `${name} has not yet won an ATP title.`
        : titleBreakdown.length > 0
        ? `${name} has won ${totalTitles} ATP title${totalTitles > 1 ? 's' : ''}, including ${titleBreakdown.join(' and ')}.`
        : `${name} has won ${totalTitles} ATP title${totalTitles > 1 ? 's' : ''}.`;
    faqItems.push({ q: `How many ATP titles has ${name} won?`, a: titleAnswer });
  }

  // Q3: surface stats
  const surfParts: string[] = [];
  if (hardWins + hardLosses > 0) surfParts.push(`Hard: ${hardWins}–${hardLosses} (${winRate(hardWins, hardLosses).toFixed(1)}% win rate)`);
  if (clayWins + clayLosses > 0) surfParts.push(`Clay: ${clayWins}–${clayLosses} (${winRate(clayWins, clayLosses).toFixed(1)}% win rate)`);
  if (grassWins + grassLosses > 0) surfParts.push(`Grass: ${grassWins}–${grassLosses} (${winRate(grassWins, grassLosses).toFixed(1)}% win rate)`);
  if (surfParts.length > 0) {
    faqItems.push({
      q: `What are ${name}'s win rates by surface?`,
      a: `${name}'s career record by surface — ${surfParts.join('; ')}.`,
    });
  }

  // Q4: where to find stats
  faqItems.push({
    q: `Where can I find ${name}'s complete tennis statistics?`,
    a: `Complete ${name} tennis statistics — match results, ATP rankings history, surface breakdowns, head-to-head records and tournament history — are available at ${url}.`,
  });

  // Q5: Top-10 record intent query
  if (top10Matches.length > 0) {
    faqItems.push({
      q: `What is ${name}'s record against Top 10 players?`,
      a: `${name} has a ${top10Wins}-${top10Losses} record against Top 10 opponents (${winRate(top10Wins, top10Losses).toFixed(1)}% win rate).`,
    });
  }

  // Q6: best season intent query
  if (bestYear && bestYearTotal > 0) {
    faqItems.push({
      q: `What has been ${name}'s best ATP season so far?`,
      a: `${name}'s best season by wins was ${bestYear}, with ${bestYearWins} wins in ${bestYearTotal} matches.`,
    });
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      {/* WEBPAGE */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />

      {/* ENTITY SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(athleteLd) }}
      />

      {/* BREADCRUMB RICH RESULT */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* FAQ RICH RESULT */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Visual breadcrumb — sr-only: leggibile da crawler, invisibile agli utenti */}
      <nav
        aria-label="Breadcrumb"
        className="sr-only"
      >
        <ol>
          <li><Link href="/">Home</Link></li>
          <li aria-current="page">{name}</li>
        </ol>
      </nav>

      {/* Bio data — sr-only: SSR Wave 1, leggibile dal crawler come HTML semantico */}
      <dl className="sr-only">
        {player.birthdate && (() => {
          const bd = player.birthdate instanceof Date
            ? (player.birthdate as Date).toISOString().split('T')[0]
            : String(player.birthdate);
          const born = player.birthplace
            ? `${bd} in ${player.birthplace}${countryName ? `, ${countryName}` : ''}`
            : bd;
          return <><dt>Born</dt><dd>{born}</dd></>;
        })()}
        {countryName && !player.birthplace && <><dt>Nationality</dt><dd>{countryName}</dd></>}
        {player.hand && (() => {
          const handMap: Record<string, string> = { R: 'Right', L: 'Left' };
          return <><dt>Hand</dt><dd>{handMap[player.hand] ?? player.hand}</dd></>;
        })()}
        {player.backhand && (() => {
          const bhMap: Record<string, string> = { '1H': '1 Hand', '1': '1 Hand', '2H': '2 Hands', '2': '2 Hands' };
          return <><dt>Backhand</dt><dd>{bhMap[player.backhand] ?? player.backhand}</dd></>;
        })()}
        {player.height && <><dt>Height</dt><dd>{player.height} cm</dd></>}
        {player.weight && <><dt>Weight</dt><dd>{player.weight} kg</dd></>}
        {player.turnedpro && <><dt>Turned Pro</dt><dd>{player.turnedpro}</dd></>}
        {player.coaches && <><dt>Coach</dt><dd>{player.coaches}</dd></>}
      </dl>

      <PlayerClient
        params={{ id: player.id, tab: tabValue }}
        initialPlayer={player}
        belowTabsSlot={
          <div className="relative text-center">
            <span className="absolute right-0 top-0 text-xs text-gray-400">
              Updated on <time dateTime={updatedDateIso}>{updatedDateIso}</time>
            </span>
            <h1 className="text-2xl font-extrabold text-yellow-300 md:text-3xl">
              {name} Statistics, Match Results, ATP Rankings &amp; Career Records
            </h1>
            <h2 className="mt-1 text-sm font-normal text-gray-300">
              This page covers {name}&apos;s ATP career record, match results, ATP ranking history, head-to-head data, plus surface, season and tournament performance.
            </h2>
          </div>
        }
        rankingNarrative={
          <RankingNarrativeServer
            playerId={player.id}
            birthdate={player.birthdate ? String(player.birthdate) : null}
            playerName={player.atpname || player.player}
            className="mb-8"
          />
        }
        overviewSlot={
          <OverviewServer
            playerId={player.id}
            playerName={player.atpname || player.player}
            playerSlug={player.slug}
          />
        }
      />
    </>
  );
}
