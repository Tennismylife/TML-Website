import React from 'react';
import PlayerClient from '../PlayerClient';
import SEOPlayer from '../SEOPlayer';
import SEOBreadcrumb from '../SEOBreadcrumb';
import AllMatchesServer from '../Matches/AllMatchesServer';
import { prisma } from '../../../../lib/prisma';
import { redirect } from 'next/navigation';
import { getPlayerHref } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

/**
 * Server-side helper to get a player by slug or id.
 * TODO: Replace with the project-wide `getPlayerBySlug` server helper when available.
 */
async function getPlayerBySlug(id: string): Promise<{ name: string; slug: string } | null> {
  const isSlug = !/^\d+$/.test(String(id));
  try {
    const p = isSlug
      ? await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { player: true, atpname: true, slug: true } })
      : await prisma.player.findUnique({ where: { id: String(id) }, select: { player: true, atpname: true, slug: true } });
    if (!p) return null;
    const name = (p.atpname || p.player) as string;
    return { name, slug: p.slug || String(id) };
  } catch (e) {
    return null;
  }
}

export async function generateMetadata(
  props: { params: Promise<{ id: string; tab?: string }>; searchParams?: Promise<Record<string, any>> }
): Promise<Metadata> {
  const { params, searchParams } = props;
  const { id, tab } = (await params) as { id: string; tab?: string };
  if (!id) return { title: 'Player | Tennis Statistics, Match Results & Rankings' } as Metadata; 

  const player = await getPlayerBySlug(id);
  const name = player?.name ?? String(id);
  const slug = player?.slug ?? String(id);

  // Build canonical URL using path segments (no query params)
  const base = 'https://stats.tennismylife.org';
  const isOverview = !tab || tab === 'overview';
  const canonical = isOverview ? `${base}/players/${encodeURIComponent(slug)}` : `${base}/players/${encodeURIComponent(slug)}/${encodeURIComponent(tab as string)}`;

  const parts = tab === 'matches'
    ? ['Stats', 'Matches', 'Results', 'Records & Rankings']
    : ['Stats', 'Overview', 'Records & Rankings'];

  // If on matches tab, build a title that mirrors the H1 (player name + heading)
  let title = `${name} – ${parts.join(', ')} | TennisMyLife`;
  if (tab === 'matches') {
    const resolvedSearchParams = await searchParams;
    const sp: Record<string, any> = resolvedSearchParams
      ? (resolvedSearchParams instanceof URLSearchParams
          ? Object.fromEntries(resolvedSearchParams.entries())
          : resolvedSearchParams)
      : {};

    const hasFilters = Object.entries(sp).some(([k, v]) => k !== 'tab' && v != null && String(v) !== '' && String(v) !== 'All');

    const headingParts: string[] = [];
    if (sp.year && sp.year !== 'All') headingParts.push(`Year: ${sp.year}`);
    if (sp.level && sp.level !== 'All') {
      const map: Record<string, string> = { G: 'Grand Slams', M: 'Masters 1000', A: 'Other', F: 'Finals', D: 'Davis Cup', O: 'Olympics' };
      headingParts.push(`Level: ${map[sp.level] ?? sp.level}`);
    }
    if (sp.surface && sp.surface !== 'All') headingParts.push(`Surface: ${sp.surface}`);
    if (sp.round && sp.round !== 'All') headingParts.push(`Round: ${sp.round}`);
    if (sp.firstSet && sp.firstSet !== 'All') headingParts.push(`First Set: ${sp.firstSet}`);
    if (sp.result && sp.result !== 'All') headingParts.push(`Result: ${sp.result}`);
    if (sp.set && sp.set !== 'All') headingParts.push(`Sets: ${sp.set}`);
    if (sp.score && sp.score !== 'All') headingParts.push(`Score: ${sp.score}`);

    const rankLabel = (v?: string) => {
      if (!v) return '';
      if (v === 'Top1') return '#1';
      if (v === 'Top5') return 'Top 5';
      if (v === 'Top10') return 'Top 10';
      if (v === 'Top20') return 'Top 20';
      if (v === 'Top50') return 'Top 50';
      if (v === 'Top100') return 'Top 100';
      if (v === '11+') return '11+';
      if (v === '21+') return '21+';
      if (v === '51+') return '51+';
      if (v === '101+') return '101+';
      if (v === 'Higher') return 'Higher than opponent';
      if (v === 'Lower') return 'Lower than opponent';
      return v;
    };
    if (sp.vsRank && sp.vsRank !== 'All') headingParts.push(`Opp Rank: ${rankLabel(sp.vsRank)}`);
    if (sp.asRank && sp.asRank !== 'All') headingParts.push(`Player Rank: ${rankLabel(sp.asRank)}`);
    if (sp.vsAge && sp.vsAge !== 'All') headingParts.push(`Opp Age: ${sp.vsAge}`);
    if (sp.vsHand && sp.vsHand !== 'All') headingParts.push(`Opp Hand: ${sp.vsHand}`);
    if (sp.vsBackhand && sp.vsBackhand !== 'All') headingParts.push(`Opp Backhand: ${sp.vsBackhand}`);
    if (sp.vsEntry && sp.vsEntry !== 'All') headingParts.push(`Opp Entry: ${sp.vsEntry}`);
    if (sp.asEntry && sp.asEntry !== 'All') headingParts.push(`Player Entry: ${sp.asEntry}`);

    let heading = 'Matches';
    if (headingParts.length) heading = `Matches — ${headingParts.join(' · ')}`;
    if (hasFilters) title = `${name} — ${heading}`;
  }
  const description = `Statistiche complete di ${name}: risultati ATP, ${tab === 'matches' ? 'match 2026, ' : ''}record carriera, ranking, titoli, head‑to‑head e performance per superficie. Aggiornato al 2026.`;
  const imageUrl = `${base}/og/${encodeURIComponent(slug)}.png`;

  // Derive profile fields for Open Graph profile (if available)
  const nameParts = String(name).split(/\s+/).filter(Boolean);
  const firstName = nameParts.length ? nameParts[0] : undefined;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const profile: { firstName?: string; lastName?: string; username?: string } = {};
  if (firstName) profile.firstName = firstName;
  if (lastName) profile.lastName = lastName;
  if (slug) profile.username = slug;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description,
      images: [{ url: imageUrl }],
      ...(Object.keys(profile).length ? { profile } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      site: '@TennisMyLife68',
      creator: '@TennisMyLife68',
    },
    robots: { index: true, follow: true },
  } as Metadata;
}

export default async function PlayerTabPage({ params, searchParams }: any) {
  const { id: slugParam, tab: tabParam } = await params;
  if (!slugParam) return <div>Player ID not provided</div>;

  const isSlug = !/^\d+$/.test(String(slugParam));

  // Resolve incoming search params so we can compute a server-side heading that reflects active filters
  const resolvedSearchParams = await searchParams;
  const resolvedParamsObj: Record<string, any> =
    resolvedSearchParams instanceof URLSearchParams
      ? Object.fromEntries(resolvedSearchParams.entries())
      : (resolvedSearchParams || {});

  // PLAYER
  const player = !isSlug
    ? await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } })
    : await prisma.player.findUnique({ where: { slug: String(slugParam).toLowerCase() }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } });

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Redirect numeric ID to slug while preserving requested tab
  if (!isSlug && player.slug) {
    redirect(`${getPlayerHref(player.slug)}/${encodeURIComponent(String(tabParam || 'matches'))}`);
  }

  // Determine tab for SEO (use 'overview' when missing) and fetch matches server-side for JSON-LD
  const tab = tabParam ?? 'overview';

  // Build a small server-side heading that reflects the active filters (used above the table)
  let matchesHeadingParts: string[] = [];
  if (tab === 'matches') {
    const sp: Record<string, any> = resolvedParamsObj || {};
    const isAll = (v?: any) => v == null || String(v).trim() === '' || String(v).toLowerCase() === 'all';
    if (!isAll(sp.year)) matchesHeadingParts.push(String(sp.year));

    if (!isAll(sp.level)) {
      const map: Record<string, string> = { G: 'Grand Slam', M: 'Masters 1000', A: 'Other', F: 'Finals', D: 'Davis Cup', O: 'Olympics' };
      matchesHeadingParts.push(map[sp.level] ?? `Level: ${sp.level}`);
    }

    const rankLabel = (v?: string) => {
      if (!v) return '';
      if (v === 'Top1') return '#1';
      if (v === 'Top5') return 'Top 5';
      if (v === 'Top10') return 'Top 10';
      if (v === 'Top20') return 'Top 20';
      if (v === 'Top50') return 'Top 50';
      if (v === 'Top100') return 'Top 100';
      if (v === '11+') return '11+';
      if (v === '21+') return '21+';
      if (v === '51+') return '51+';
      if (v === '101+') return '101+';
      if (v === 'Higher') return 'Higher than opponent';
      if (v === 'Lower') return 'Lower than opponent';
      return v;
    };

    if (!isAll(sp.surface)) matchesHeadingParts.push(sp.surface);
    if (!isAll(sp.round)) matchesHeadingParts.push(sp.round);
    if (!isAll(sp.firstSet)) matchesHeadingParts.push(sp.firstSet);
    if (!isAll(sp.result)) matchesHeadingParts.push(sp.result);
    if (!isAll(sp.set)) matchesHeadingParts.push(sp.set);
    if (!isAll(sp.score)) matchesHeadingParts.push(sp.score);
    if (!isAll(sp.vsRank)) matchesHeadingParts.push(`Opp Rank: ${rankLabel(sp.vsRank)}`);
    if (!isAll(sp.asRank)) matchesHeadingParts.push(`Player Rank: ${rankLabel(sp.asRank)}`);
    if (!isAll(sp.vsAge)) matchesHeadingParts.push(`Opp Age: ${sp.vsAge}`);
    if (!isAll(sp.vsHand)) matchesHeadingParts.push(`Opp Hand: ${sp.vsHand}`);
    if (!isAll(sp.vsBackhand)) matchesHeadingParts.push(`Opp Backhand: ${sp.vsBackhand}`);
    if (!isAll(sp.vsEntry)) matchesHeadingParts.push(`Opp Entry: ${sp.vsEntry}`);
    if (!isAll(sp.asEntry)) matchesHeadingParts.push(`Player Entry: ${sp.asEntry}`);

    if (!isAll(sp.tourney)) {
      try {
        // Tournament.name is stored as JSON (localized). Select 'name' and derive a readable string.
        const tourney = await prisma.tournament.findUnique({ where: { id: Number(sp.tourney) }, select: { name: true } });
        if (tourney && tourney.name) {
          let tn = '';
          if (typeof tourney.name === 'string') tn = tourney.name;
          else if (tourney.name && typeof tourney.name === 'object') tn = (tourney.name as any).en || Object.values(tourney.name as any)[0] || '';
          matchesHeadingParts.push(tn || String(sp.tourney));
        } else matchesHeadingParts.push(String(sp.tourney));
      } catch (e) {
        matchesHeadingParts.push(String(sp.tourney));
      }
    }
  }

  const matchesHeading = matchesHeadingParts.length ? `Matches — ${matchesHeadingParts.join(' · ')}` : 'Matches';

  const matches = await prisma.match.findMany({
    where: { OR: [{ winner_id: player.id }, { loser_id: player.id }] },
    select: { status: true, winner_id: true, loser_id: true, surface: true },
  });

  // Compute career totals (server-side) to pass as initialTotals to the client without fetching all rows
  const careerMatches = matches.filter(m => m.status !== false);
  const careerWins = careerMatches.filter(m => String(m.winner_id) === String(player.id)).length;
  const careerLosses = careerMatches.filter(m => String(m.loser_id) === String(player.id)).length;

  // Fetch only latest 10 matches for SSR (optimized first load)
  let allMatchesForSSR: any[] | null = null;
  if (tab === 'matches') {
    try {
      // Build a WHERE clause that respects external URL filters (at least year for now)
      const whereClause: any = {
        OR: [{ winner_id: player.id }, { loser_id: player.id }],
        status: true,
      };
      // Support simple year & surface filters provided via query params (e.g. ?year=2026&surface=Hard)
      const sp: Record<string, any> = resolvedParamsObj || {};
      if (sp.year && String(sp.year).toLowerCase() !== 'all') {
        const y = Number(sp.year);
        if (!Number.isNaN(y)) whereClause.year = y;
      }
      if (sp.surface && String(sp.surface).toLowerCase() !== 'all') {
        // Use a case-insensitive "contains" filter so variations like "Hard Indoor" match "Hard"
        whereClause.surface = { contains: String(sp.surface), mode: 'insensitive' } as any;
      }

      allMatchesForSSR = await prisma.match.findMany({
        where: whereClause,
        orderBy: { tourney_date: 'desc' },
        take: 10, // Only fetch 10 matches for initial SSR
      });

      // Enrich with slugs
      if (allMatchesForSSR && allMatchesForSSR.length) {
        const playerIds = Array.from(
          new Set(
            allMatchesForSSR.flatMap((m) => [m.winner_id, m.loser_id]).filter(Boolean)
          )
        );
        try {
          const { mapIdsToSlugs } = await import('@/lib/player-slugs');
          const slugMap = await mapIdsToSlugs(playerIds as string[]);
          allMatchesForSSR = allMatchesForSSR.map((m: any) => ({
            ...m,
            winner_slug: m.winner_id ? slugMap[String(m.winner_id)] ?? null : null,
            loser_slug: m.loser_id ? slugMap[String(m.loser_id)] ?? null : null,
          }));
        } catch (e) {
          // ignore slug enrichment errors
        }
      }
    } catch (e) {
      // ignore match fetch errors; client will fetch if needed
    }
  }

  // Render SEO script BEFORE the client component (must be server-rendered)
  return (
    <>
      <SEOPlayer
        playerId={player.id}
        slug={player.slug}
        name={player.atpname || player.player}
        atpname={player.atpname}
        birthdate={player.birthdate ? (player.birthdate instanceof Date ? player.birthdate.toISOString() : String(player.birthdate)) : undefined}
        ioc={player.ioc}
        birthplace={player.birthplace}
        tab={tab}
        matches={matches}
      />

      <SEOBreadcrumb slug={player.slug} name={player.atpname || player.player} tab={tab} />

      {/* Server-rendered matches table for SSR (visible in HTML when matches tab) */}
      {tab === 'matches' && (
        <h1 className="sr-only">{matchesHeading}</h1>
      )}
      {allMatchesForSSR && allMatchesForSSR.length ? (
        <AllMatchesServer playerId={player.id} matches={allMatchesForSSR} heading={matchesHeading} />
      ) : null}

      <PlayerClient params={{ id: player.id, tab: tabParam ?? 'matches' }} initialMatches={allMatchesForSSR ?? undefined} initialHeading={matchesHeading ?? 'Matches'} initialTotals={{ totalWins: careerWins, totalLosses: careerLosses }} />
    </>
  );
}
