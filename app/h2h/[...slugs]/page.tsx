import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import H2HClient from '../H2HClient';
import H2HContentClient from '../H2HContentClient';
import H2HPreviewServer from '../H2HPreviewServer';
import H2HCareerOverviewServer from '../H2HCareerOverviewServer';
import { prisma } from '@/lib/prisma';
import { metadataBase } from '@/lib/site';
import { getPlayerHref, IOC_TO_ISO, createSlug, createH2HUrl } from '@/lib/utils';
import { mapIdsToSlugs } from '@/lib/player-slugs';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

const canonicalOrigin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://stats.tennismylife.org');

export const dynamic = 'force-dynamic';
const ENABLE_H2H_NOINDEX_ALGORITHM = true;

async function playerIsActive(playerId: string, latestRankingDateId: number | null) {
  if (!playerId) return false;

  if (latestRankingDateId) {
    const currentRanking = await prisma.ranking.findFirst({
      where: {
        playerId: String(playerId),
        rankingDateId: latestRankingDateId,
      },
      select: { id: true },
    });
    if (currentRanking) return true;
  }

  const last18Months = new Date();
  last18Months.setUTCMonth(last18Months.getUTCMonth() - 18);

  const recentMatch = await prisma.match.findFirst({
    where: {
      status: true,
      tourney_date: { gte: last18Months },
      OR: [
        { winner_id: playerId },
        { loser_id: playerId },
      ],
    },
    select: { id: true },
  });
  return Boolean(recentMatch);
}

async function playerHasRecentMatch(playerId: string) {
  if (!playerId) return false;
  const last18Months = new Date();
  last18Months.setUTCMonth(last18Months.getUTCMonth() - 18);

  const recentMatch = await prisma.match.findFirst({
    where: {
      status: true,
      tourney_date: { gte: last18Months },
      OR: [
        { winner_id: playerId },
        { loser_id: playerId },
      ],
    },
    select: { id: true },
  });
  return Boolean(recentMatch);
}

async function playerHasEverBeenTop20(playerId: string) {
  if (!playerId) return false;
  const everTop20 = await prisma.ranking.findFirst({
    where: {
      playerId: String(playerId),
      rank: { lte: 20 },
    },
    select: { id: true },
  });
  return Boolean(everTop20);
}

async function playerHasDirectH2HMatch(player1Id: string, player2Id: string) {
  const match = await prisma.match.findFirst({
    where: {
      status: true,
      OR: [
        { winner_id: player1Id, loser_id: player2Id },
        { winner_id: player2Id, loser_id: player1Id },
      ],
    },
    select: { id: true },
  });
  return Boolean(match);
}

async function isPlayerEligibleForH2H(playerId: string, latestRankingDateId: number | null) {
  if (!playerId) return false;
  const active = await playerIsActive(playerId, latestRankingDateId);
  if (active) return true;
  return await playerHasEverBeenTop20(playerId);
}

async function resolvePlayersFromSlug(slug: string) {
  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (!match) return { p1: null as any, p2: null as any };

  const p1slugRaw = match[1];
  const p2slugRaw = match[2];
  const p1slug = p1slugRaw.replace(/-/g, ' ');
  const p2slug = p2slugRaw.replace(/-/g, ' ');

  const [p1BySlug, p2BySlug] = await Promise.all([
    prisma.player.findUnique({ where: { slug: p1slugRaw }, select: { id: true, atpname: true } }),
    prisma.player.findUnique({ where: { slug: p2slugRaw }, select: { id: true, atpname: true } }),
  ]);

  const [p1ByName, p2ByName] = await Promise.all([
    prisma.player.findFirst({ where: { atpname: { equals: p1slug, mode: 'insensitive' } }, select: { id: true, atpname: true } }),
    prisma.player.findFirst({ where: { atpname: { equals: p2slug, mode: 'insensitive' } }, select: { id: true, atpname: true } }),
  ]);

  const p1 = p1BySlug ?? p1ByName ?? null;
  const p2 = p2BySlug ?? p2ByName ?? null;

  return { p1, p2 };
}

async function isH2HIndexable(slug: string) {
  if (!slug) return false;
  const { p1, p2 } = await resolvePlayersFromSlug(slug);
  if (!p1 || !p2) return false;

  const latestRankingDate = await prisma.rankingDate.findFirst({ orderBy: { date: 'desc' }, select: { id: true } });
  const latestRankingDateId = latestRankingDate?.id ?? null;

  const [p1Active, p2Active, p1RecentMatch, p2RecentMatch, p1Eligible, p2Eligible, p1EverTop20, p2EverTop20] = await Promise.all([
    playerIsActive(p1.id, latestRankingDateId),
    playerIsActive(p2.id, latestRankingDateId),
    playerHasRecentMatch(p1.id),
    playerHasRecentMatch(p2.id),
    isPlayerEligibleForH2H(p1.id, latestRankingDateId),
    isPlayerEligibleForH2H(p2.id, latestRankingDateId),
    playerHasEverBeenTop20(p1.id),
    playerHasEverBeenTop20(p2.id),
  ]);

  if (p1RecentMatch && p2RecentMatch) {
    return true;
  }
  if (p1Active && p2Active) {
    return true;
  }
  if (p1Eligible && p2Eligible && (p1EverTop20 || p2EverTop20)) {
    return await playerHasDirectH2HMatch(p1.id, p2.id);
  }

  return false;
}

async function hasEverBeenTop20(playerId: string) {
  if (!playerId) return false;
  const everTop20 = await prisma.ranking.findFirst({
    where: {
      playerId: String(playerId),
      rank: { lte: 20 },
    },
    select: { id: true },
  });
  return Boolean(everTop20);
}

export async function generateMetadata({ params, searchParams }: { params?: Promise<{ slugs?: string[] }> | { slugs?: string[] }, searchParams?: Record<string, string | string[]> }): Promise<Metadata> {
  // Next.js 16+ params can be a Promise
  const resolvedParams = params instanceof Promise ? await params : params;
  const slugArr = resolvedParams?.slugs;
  const slug = Array.isArray(slugArr) ? slugArr.join('/') : slugArr?.[0] || '';

  let player1Name: string | null = null;
  let player2Name: string | null = null;

  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (match) {
    const p1slugRaw = match[1];
    const p2slugRaw = match[2];
    const p1slug = p1slugRaw.replace(/-/g, ' ');
    const p2slug = p2slugRaw.replace(/-/g, ' ');
    try {
      // Prefer lookup by slug (URL) and fallback to atpname matching to avoid
      // false negatives caused by spacing/casing/punctuation differences.
      const [p1BySlug, p2BySlug] = await Promise.all([
        prisma.player.findUnique({ where: { slug: p1slugRaw }, select: { id: true, atpname: true } }),
        prisma.player.findUnique({ where: { slug: p2slugRaw }, select: { id: true, atpname: true } }),
      ]);

      const [p1ByName, p2ByName] = await Promise.all([
        prisma.player.findFirst({ where: { atpname: { equals: p1slug, mode: 'insensitive' } }, select: { id: true, atpname: true } }),
        prisma.player.findFirst({ where: { atpname: { equals: p2slug, mode: 'insensitive' } }, select: { id: true, atpname: true } } ),
      ]);

      const p1 = p1BySlug ?? p1ByName ?? null;
      const p2 = p2BySlug ?? p2ByName ?? null;

      player1Name = p1?.atpname ?? null;
      player2Name = p2?.atpname ?? null;
    } catch (err) {
      // ignore and fallback to generic metadata
    }
  }

  const siteTitle = player1Name && player2Name ? `${player1Name} vs ${player2Name} H2H - Tennis  Head to Head, Matches, Stats` : 'Head-to-Head - Tennis  Head to Head, Matches, Stats';
  const description = player1Name && player2Name ? `${player1Name} vs ${player2Name} head-to-head: H2H record, match stats and analysis. Compare ATP players.` : 'Head-to-head statistics between players.'; 
  const path = `/h2h/${slug}`;
  const canonicalPath = player1Name && player2Name ? createH2HUrl(player1Name, player2Name) : path;
  const ogImage = new URL('/og/site-preview.png', canonicalOrigin).toString();
  const canonical = new URL(canonicalPath, canonicalOrigin).toString();

  const indexable = await isH2HIndexable(slug);
  const hasQuery = searchParams && Object.keys(searchParams).length > 0;
  const shouldIndex = !hasQuery && (ENABLE_H2H_NOINDEX_ALGORITHM ? indexable : true);

  return {
    title: siteTitle,
    description,
    authors: [{ name: 'TennisMyLife' }],
    robots: { index: shouldIndex, follow: true },
    openGraph: {
      title: siteTitle,
      description,
      url: canonical,
      siteName: 'TennisMyLife',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: siteTitle, description, images: [ogImage] },
    alternates: { canonical },
  };
}

export default async function Page({ params, searchParams }: { params?: Promise<{ slugs?: string[] }> | { slugs?: string[] }, searchParams?: Record<string, string | string[]> }) {
  // Next.js 16+ params can be a Promise
  const resolvedParams = params instanceof Promise ? await params : params;
  const slugArr = resolvedParams?.slugs;
  const slug = Array.isArray(slugArr) ? slugArr.join('/') : slugArr?.[0] || '';

  const hasQuery = searchParams && Object.keys(searchParams).length > 0;

  const qBestOf = (() => {
    if (!searchParams) return undefined;
    const v = (searchParams as any).best_of ?? (searchParams as any).bestOf;
    if (!v) return undefined;
    return Array.isArray(v) ? v[0] : v;
  })();

  let player1: any = null;
  let player2: any = null;
  let initialMatches: any[] = [];
  let availableOpponents: string[] = [];
  let rank1: number | null = null;
  let rank2: number | null = null;
  let points1: number | null = null;
  let points2: number | null = null;

  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (match) {
    const p1slug = match[1].replace(/-/g, ' ');
    const p2slug = match[2].replace(/-/g, ' ');
    try {
        // Prefer lookup by slug (from URL) and fallback to atpname search for robustness
      const [p1BySlug, p2BySlug] = await Promise.all([
        prisma.player.findUnique({ where: { slug: match[1] } }),
        prisma.player.findUnique({ where: { slug: match[2] } }),
      ]);

      const [p1ByName, p2ByName] = await Promise.all([
        prisma.player.findFirst({ where: { atpname: { equals: p1slug, mode: 'insensitive' } } }),
        prisma.player.findFirst({ where: { atpname: { equals: p2slug, mode: 'insensitive' } } }),
      ]);

      const p1 = p1BySlug ?? p1ByName ?? null;
      const p2 = p2BySlug ?? p2ByName ?? null;

      player1 = p1 ?? null;
      player2 = p2 ?? null;

      if (player1 && player2) {
        const canonicalSlug = createH2HUrl(player1.atpname ?? '', player2.atpname ?? '');
        const currentPath = `/h2h/${slug}`;
        if (canonicalSlug !== currentPath) {
          const queryString = searchParams && Object.keys(searchParams).length > 0
            ? new URLSearchParams(
                Object.entries(searchParams).flatMap(([key, value]) =>
                  Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
                )
              ).toString()
            : '';
          redirect(queryString ? `${canonicalSlug}?${queryString}` : canonicalSlug);
        }
      }

      // Fetch H2H matches server-side if both players found
      if (player1 && player2) {
        try {
          const where: any = {
            OR: [
              { winner_id: player1.id, loser_id: player2.id },
              { winner_id: player2.id, loser_id: player1.id },
            ],
          };

          if (qBestOf && String(qBestOf).toLowerCase() !== 'all') {
            const bof = Number(qBestOf);
            if (!Number.isNaN(bof)) where.best_of = bof;
          }

          const matches = await prisma.match.findMany({
            where,
            orderBy: { tourney_date: 'asc' },
          });

          // Normalize date and then enrich matches with player slugs for reliable slug links
          const normalized = matches.map((m: any) => ({
            ...m,
            tourney_date: m.tourney_date ? (m.tourney_date instanceof Date ? m.tourney_date.toISOString().split('T')[0] : String(m.tourney_date)) : null,
          }));

          // Map unique player ids to slugs
          const playerIds = new Set<string>();
          for (const m of normalized) {
            if (m.winner_id) playerIds.add(String(m.winner_id));
            if (m.loser_id) playerIds.add(String(m.loser_id));
          }
          const slugMap = await mapIdsToSlugs(Array.from(playerIds));

          // Resolve tourney slugs for matches so clients can link to canonical slug URLs
          const tourneyIdParts = Array.from(new Set(normalized.map((m: any) => {
            const s = String(m.tourney_id || '');
            const parts = s.split('-').filter(Boolean);
            return parts.length === 2 ? parts[1] : s;
          }).filter(Boolean)));

          let tourneyMap: Record<string, string | null> = {};
          try {
            if (tourneyIdParts.length > 0) {
              const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map((v) => Number(v)) } }, select: { id: true, slug: true } });
              tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? null; return acc; }, {});
            }
          } catch (err) {
            // best-effort: if lookup fails, continue without tourney_slug
            tourneyMap = {};
          }

          initialMatches = normalized.map((m: any) => ({
            ...m,
            winner_slug: slugMap[String(m.winner_id)] ?? undefined,
            loser_slug: slugMap[String(m.loser_id)] ?? undefined,
            tourney_slug: (() => {
              const s = String(m.tourney_id || '');
              const parts = s.split('-').filter(Boolean);
              const idPart = parts.length === 2 ? parts[1] : s;
              return idPart ? (tourneyMap[String(idPart)] ?? undefined) : undefined;
            })(),
          }));
        } catch (matchErr) {
          console.error('Error fetching matches:', matchErr);
          initialMatches = [];
        }
      }

      // Skip opponents fetch for now to avoid query complexity
      availableOpponents = [];

      // Fetch ranking from the single latest ranking snapshot
      // Both players must be in the same snapshot; if absent → null (empty)
      const latestRankingDate = await prisma.rankingDate.findFirst({
        orderBy: { date: 'desc' },
        select: { id: true },
      });
      if (latestRankingDate) {
        const [r1, r2] = await Promise.all([
          player1 ? prisma.ranking.findFirst({
            where: { playerId: String(player1.id), rankingDateId: latestRankingDate.id },
            select: { rank: true, points: true },
          }) : null,
          player2 ? prisma.ranking.findFirst({
            where: { playerId: String(player2.id), rankingDateId: latestRankingDate.id },
            select: { rank: true, points: true },
          }) : null,
        ]);
        rank1 = r1?.rank ?? null;
        rank2 = r2?.rank ?? null;
        points1 = r1?.points ?? null;
        points2 = r2?.points ?? null;
      }
    } catch (err: any) {
      // Re-throw Next.js redirect/notFound errors — do NOT swallow them
      if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.digest?.startsWith('NEXT_NOT_FOUND')) throw err;
      console.error('Error in H2H page:', err);
      player1 = null;
      player2 = null;
      initialMatches = [];
      availableOpponents = [];
    }
  }

  // Fetch the 5 most recent seasons for each player (crawlable internal links)
  let seasons1: number[] = [];
  let seasons2: number[] = [];
  if (player1 && player2) {
    try {
      const [raw1, raw2] = await Promise.all([
        prisma.match.findMany({
          where: { OR: [{ winner_id: player1.id }, { loser_id: player1.id }], status: true },
          select: { year: true },
          distinct: ['year'],
          orderBy: { year: 'desc' },
          take: 5,
        }),
        prisma.match.findMany({
          where: { OR: [{ winner_id: player2.id }, { loser_id: player2.id }], status: true },
          select: { year: true },
          distinct: ['year'],
          orderBy: { year: 'desc' },
          take: 5,
        }),
      ]);
      seasons1 = raw1.map((r: any) => r.year).filter(Boolean);
      seasons2 = raw2.map((r: any) => r.year).filter(Boolean);
    } catch (e) {
      // best-effort
    }
  }

  // Build JSON-LD structured data for the page
  const pageTitle = player1 && player2 ? `${player1.atpname} vs ${player2.atpname} H2H - Tennis  Head to Head, Matches, Stats` : 'Head-to-Head - Tennis  Head to Head, Matches, Stats';
  const pageDescription = player1 && player2 ? `${player1.atpname} vs ${player2.atpname} head-to-head: H2H record, match stats and analysis. Compare ATP players.` : 'Head-to-head statistics between players.';
  const path = slug ? `/h2h/${slug}` : '/h2h';
  const canonicalPath = player1 && player2 ? createH2HUrl(player1.atpname ?? '', player2.atpname ?? '') : path;
  const canonical = new URL(canonicalPath, canonicalOrigin).toString();

  const playersAsPersons = [] as any[];
  if (player1) {
    playersAsPersons.push({
      "@type": "Person",
      name: player1.atpname,
      sameAs: new URL(getPlayerHref(player1.slug ?? (player1.id ? String(player1.id) : player1.atpname)), canonicalOrigin).toString(),
    });
  }
  if (player2) {
    playersAsPersons.push({
      "@type": "Person",
      name: player2.atpname,
      sameAs: new URL(getPlayerHref(player2.slug ?? (player2.id ? String(player2.id) : player2.atpname)), canonicalOrigin).toString(),
    });
  }

  // Additional metadata fields used in structured data when both players exist
  let aboutArr: any[] = [];
  let keywords: string | undefined;
  if (player1 && player2) {
    aboutArr = [
      { "@id": (new URL(getPlayerHref(player1.slug ?? (player1.id ? String(player1.id) : String(player1.atpname))), canonicalOrigin).toString()) },
      { "@id": (new URL(getPlayerHref(player2.slug ?? (player2.id ? String(player2.id) : String(player2.atpname))), canonicalOrigin).toString()) },
    ];
    keywords = `${player1.atpname} vs ${player2.atpname}, ${player1.atpname} ${player2.atpname} h2h, ${player1.atpname} ${player2.atpname} head to head, tennis h2h stats, ${player1.atpname} ${player2.atpname} matches, ${player1.atpname} ${player2.atpname} comparison, ATP h2h`;
  }

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: canonical,
    inLanguage: 'en-US',
    isPartOf: { "@type": "WebSite", name: 'TennisMyLife', url: canonicalOrigin.toString() },
    ...(aboutArr.length ? { about: aboutArr } : {}),
    ...(keywords ? { keywords } : {}),
    dateModified: new Date().toISOString(),
  };

  if (playersAsPersons.length) {
    // include as mainEntity and about
    jsonLd.mainEntity = {
      "@type": "ItemList",
      itemListElement: playersAsPersons.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: p })),
    };
    jsonLd.about = playersAsPersons;
  }

  // Build BreadcrumbList JSON-LD
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalOrigin.toString() },
      { "@type": "ListItem", position: 2, name: "Head-to-Head", item: new URL('/h2h', canonicalOrigin).toString() },
      { "@type": "ListItem", position: 3, name: pageTitle, item: canonical },
    ],
  };

  // Ensure country names are registered
  try { countries.registerLocale(enLocale as any); } catch {}

  function buildPersonJson(player: any) {
    if (!player) return null;

    const ioc = player.ioc ?? '';
    const iso = (ioc && IOC_TO_ISO[ioc.toUpperCase()]) || undefined;
    const countryName = iso ? countries.getName(iso, 'en') : undefined;

    const slug = player.slug ?? (player.id ? String(player.id) : String(player.atpname ?? ''));
    const playerUrl = new URL(getPlayerHref(slug), canonicalOrigin).toString();
    const personId = `${playerUrl}#person`;
    const nameForWiki = (player.atpname || player.player || '').replace(/\s+/g, '_');

    const additionalProperty: any[] = [];
    if (player.height) additionalProperty.push({ '@type': 'PropertyValue', name: 'Height', value: Number(player.height), unitCode: 'CMT', unitText: 'cm' });
    if (player.weight) additionalProperty.push({ '@type': 'PropertyValue', name: 'Weight', value: Number(player.weight), unitCode: 'KGM', unitText: 'kg' });
    if (player.hand) {
      const handMap: Record<string, string> = { R: 'Right-handed', L: 'Left-handed' };
      additionalProperty.push({ '@type': 'PropertyValue', name: 'Playing Hand', value: handMap[player.hand] ?? player.hand });
    }
    if (player.backhand) {
      const bhMap: Record<string, string> = { '1H': 'One-handed backhand', '1': 'One-handed backhand', '2H': 'Two-handed backhand', '2': 'Two-handed backhand' };
      additionalProperty.push({ '@type': 'PropertyValue', name: 'Backhand', value: bhMap[player.backhand] ?? player.backhand });
    }
    if (player.turnedpro) additionalProperty.push({ '@type': 'PropertyValue', name: 'Turned Pro', value: Number(player.turnedpro) });
    if (player.coaches) additionalProperty.push({ '@type': 'PropertyValue', name: 'Coach', value: String(player.coaches) });

    const nameParts = (player.atpname || player.player || '').split(/\s+/).filter(Boolean);
    const givenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] ?? '');
    const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    return {
      '@context': 'https://schema.org',
      '@type': 'Athlete',
      '@id': personId,
      name: player.atpname || player.player || '',
      givenName,
      familyName,
      sport: 'Tennis',
      url: playerUrl,
      mainEntityOfPage: playerUrl,
      ...(player.birthdate ? { birthDate: player.birthdate instanceof Date ? player.birthdate.toISOString().split('T')[0] : String(player.birthdate) } : {}),
      ...(player.birthplace ? { birthPlace: { '@type': 'Place', name: String(player.birthplace) } } : {}),
      ...(countryName ? { nationality: { '@type': 'Country', name: countryName } } : {}),
      memberOf: { '@type': 'Organization', name: 'ATP Tour', url: 'https://www.atptour.com' },
      sameAs: [
        playerUrl,
        `https://en.wikipedia.org/wiki/${encodeURIComponent(nameForWiki)}`,
        `https://www.atptour.com/en/players/${encodeURIComponent(slug)}/${String(player.id ?? '').toLowerCase()}/overview`,
      ],
      ...(additionalProperty.length ? { additionalProperty } : {}),
    };
  }

  const personJson1 = buildPersonJson(player1);
  const personJson2 = buildPersonJson(player2);

  // Calculate H2H stats for server-side rendering
  const heading = (() => {
    if (player1 && player2) {
      const s1 = createSlug(player1.atpname ?? player1.player ?? String(player1.id ?? ''));
      const s2 = createSlug(player2.atpname ?? player2.player ?? String(player2.id ?? ''));
      const [first, second] = s1 <= s2 ? [player1.atpname ?? '', player2.atpname ?? ''] : [player2.atpname ?? '', player1.atpname ?? ''];
      return `${first} vs ${second} Head to Head Tennis Stats and Match Analysis`;
    }
    return 'Head-to-Head';
  })();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />
      {personJson1 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJson1) }} />}
      {personJson2 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJson2) }} />}

      <h1 className="page-title text-3xl font-bold mb-8 text-center">{heading}</h1>
      {player1 && player2 && (seasons1.length > 0 || seasons2.length > 0) && (
        <div className="container mx-auto px-4 mb-6 flex flex-wrap justify-center gap-8 text-sm">
          {seasons1.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-300">{player1.atpname} seasons:</span>
              {seasons1.map((y) => (
                <Link
                  key={y}
                  href={`/players/${encodeURIComponent(player1.slug ?? String(player1.id))}/season/${y}`}
                  className="px-2 py-0.5 rounded bg-gray-700 hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  {y}
                </Link>
              ))}
            </div>
          )}
          {seasons2.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-300">{player2.atpname} seasons:</span>
              {seasons2.map((y) => (
                <Link
                  key={y}
                  href={`/players/${encodeURIComponent(player2.slug ?? String(player2.id))}/season/${y}`}
                  className="px-2 py-0.5 rounded bg-gray-700 hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  {y}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      {player1 && player2 ? (
        <div className="container mx-auto px-4 py-8">
          <H2HContentClient
            matches={initialMatches}
            player1={player1}
            player2={player2}
            rank1={rank1}
            rank2={rank2}
            points1={points1}
            points2={points2}
            careerOverview={
              <H2HCareerOverviewServer
                player1={player1}
                player2={player2}
              />
            }
          >
            <H2HPreviewServer
              player1={player1}
              player2={player2}
              matches={initialMatches}
            />
          </H2HContentClient>
        </div>
      ) : (
        <H2HClient 
          initialPlayer1={player1} 
          initialPlayer2={player2} 
          initialMatches={initialMatches}
          initialOpponents={availableOpponents}
        />
      )}
    </>
  );
}
