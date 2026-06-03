import React from 'react';
import fs from 'fs';
import path from 'path';
import PlayerClient from '../PlayerClient';
import SEOPlayer from '../SEOPlayer';
import SEOBreadcrumb from '../SEOBreadcrumb';
import CurrentRankingBanner from '../Ranking/CurrentRankingBanner';
import RankingNarrativeServer from '../Ranking/RankingNarrativeServer';
import AllMatchesServer from '../Matches/AllMatchesServer';
import { prisma } from '../../../../lib/prisma';
import { redirect, permanentRedirect } from 'next/navigation';
import { getPlayerHref, createSlug } from '@/lib/utils';
import type { Metadata } from 'next';
import { isPlayerInTop100IndexAllowlist } from '../playerIndexing';

function getRankingAllowlist(): Set<string> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'ranking to index.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    return new Set(
      content.split('\n').map(l => l.trim()).filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function normalizeTourneyKey(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function canonicalGrandSlam(name: string) {
  const key = normalizeTourneyKey(name);
  if (key.includes('australian') && (key.includes('open') || key.includes('championship'))) return 'Australian Open';
  if (key.includes('roland') || key.includes('french open')) return 'Roland Garros';
  if (key.includes('wimbledon')) return 'Wimbledon';
  if ((key.includes('us') || key.includes('u s') || key.includes('united states')) && key.includes('open')) return 'US Open';
  return name;
}

function resolveTourneyName(raw: any): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const unique = Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean)));
    if (unique.length === 0) return null;
    const joined = unique.length > 1 ? unique.join(' / ') : unique[0];
    return canonicalGrandSlam(joined);
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    const candidate = obj.en ?? Object.values(obj)[0];
    if (candidate == null) return null;
    if (Array.isArray(candidate)) {
      const unique = Array.from(new Set(candidate.map((v) => String(v ?? '').trim()).filter(Boolean)));
      if (unique.length === 0) return null;
      const joined = unique.length > 1 ? unique.join(' / ') : unique[0];
      return canonicalGrandSlam(joined);
    }
    const cleaned = String(candidate).trim();
    return cleaned ? canonicalGrandSlam(cleaned) : null;
  }
  const cleaned = String(raw).trim();
  return cleaned ? canonicalGrandSlam(cleaned) : null;
}

export const revalidate = false; // cache infinita — rivalidare via /api/revalidate dopo import DB

/**
 * Server-side helper to get a player by slug or id.
 * TODO: Replace with the project-wide `getPlayerBySlug` server helper when available.
 */
async function getPlayerBySlug(id: string): Promise<{ name: string; slug: string } | null> {
  const isSlug = !/^\d+$/.test(String(id));
  try {
    let p = isSlug
      ? await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { player: true, atpname: true, slug: true } })
      : await prisma.player.findUnique({ where: { id: String(id) }, select: { player: true, atpname: true, slug: true } });

    // If slug not found and id looks like a legacy code, query /api/slug-map to resolve a canonical slug and fetch it
    if (isSlug && !p) {
      try {
        const apiUrl = 'https://stats.tennismylife.org/api/slug-map';
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
        if (apiResp.ok) {
          const maps = await apiResp.json();
          const mapped = maps?.players?.[String(id).toUpperCase()];
          if (mapped) {
            p = await prisma.player.findUnique({ where: { slug: mapped }, select: { player: true, atpname: true, slug: true } });
          }
        }
      } catch (e) {}
    }

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
  const isTop100Allowed = await isPlayerInTop100IndexAllowlist(String(id));

  // Build canonical URL using path segments and include query params for matches when filters are active
  const base = 'https://stats.tennismylife.org';
  const isOverview = !tab || tab === 'overview';
  let canonical = isOverview ? `${base}/players/${encodeURIComponent(slug)}` : `${base}/players/${encodeURIComponent(slug)}/${encodeURIComponent(tab as string)}`;

  // Resolve search params for conditional canonical building
  const resolvedSearchParamsForCanonical = await searchParams;
  const spForCanonical: Record<string, any> = resolvedSearchParamsForCanonical
    ? (resolvedSearchParamsForCanonical instanceof URLSearchParams
        ? Object.fromEntries(resolvedSearchParamsForCanonical.entries())
        : resolvedSearchParamsForCanonical)
    : {};

  // If on season tab, include year segment in canonical when available and meaningful
  if (tab === 'season') {
    if (spForCanonical.year && String(spForCanonical.year) !== 'All') {
      canonical = `${canonical}/${encodeURIComponent(String(spForCanonical.year))}`;
    }
  }

  // For matches tab, consolidate signals to the player overview canonical URL.
  if (tab === 'matches') {
    canonical = `${base}/players/${encodeURIComponent(slug)}`;
  }

  // determine the series of comma-separated parts used for SEO titles
  const partsBase = tab === 'matches' ? ['Stats', 'Matches', 'Results'] : ['Stats', 'Overview'];
  const parts: string[] = [...partsBase, 'Records & Rankings'];
  if (tab === 'ranking') {
    parts.push('Rank History');
  }

  // If on matches tab, build a title that mirrors the H1 (player name + heading)
  let title = `${name} – Stats, Matches, Results, Records & Rankings | TennisMyLife`;
  // Description is built later, declare it early so branches can assign it safely
  let metaDescription: string = "";

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
    if (hasFilters) {
      title = `${name} — ${heading}`;
    } else {
      title = `${name} – Match Results & Career Stats | TennisMyLife`;
    }
  }

  // If on ranking tab, use a dedicated title
  if (tab === 'ranking') {
    title = `${name} ATP Ranking History & Stats | TennisMyLife`;
  }

  // If on season tab, prefer a season-specific title (use year if available)
  if (tab === 'season') {
    const resolvedSearchParams = await searchParams;
    const sp: Record<string, any> = resolvedSearchParams
      ? (resolvedSearchParams instanceof URLSearchParams
          ? Object.fromEntries(resolvedSearchParams.entries())
          : resolvedSearchParams)
      : {};

    if (sp.year && String(sp.year) !== 'All') {
      // Format required: "Carlos Alcaraz 2025 Season Stats | Wins, Titles & Match Results | TennisMyLife"
      const y = String(sp.year);
      title = `${name} ${y} Season Stats | Wins, Titles & Match Results | TennisMyLife`;
      metaDescription = `Complete ${name} ${y} season stats: match results, win-loss record, titles won, surface performance (hard, clay, grass) and detailed ATP breakdown on TennisMyLife.`; 
    } else {
      title = `${name} — Seasons | TennisMyLife`;
      metaDescription = `Season-by-season statistics for ${name}: wins, titles, results, and seasonal performance.`;
    }
  }

  // Tab-specific or generic description
  const currentYear = new Date().getFullYear();
  if (tab === 'ranking') {
    metaDescription = `${name} ATP ranking history: week-by-week ranking chart, career peak ranking, weeks at top, and full career ranking progression. Updated as of ${currentYear} on TennisMyLife.`;
  } else {
    metaDescription = `Complete statistics for ${name}: ATP results, ${tab === 'matches' ? `${currentYear} matches, ` : ''}career record, rankings, titles, head-to-head records, and surface performance. Updated as of ${currentYear}.`;
  }
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
    description: metaDescription,
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description: metaDescription,
      images: [{ url: imageUrl }],
      ...(Object.keys(profile).length ? { profile } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      images: [imageUrl],
      site: '@TennisMyLife68',
      creator: '@TennisMyLife68',
    },
    // Noindex rules:
    // - matches tab: always noindex (all URLs, with or without filters).
    // - matches tab: indexed (canonical points to player landing).
    // - tournaments / statistics / performance: always noindex.
    // - ranking tab: only index players in the allowlist.
    // - surface tabs (clay/hard/grass): only index top-100 players.
    robots: ((): { index: boolean; follow: boolean } => {
      const VALID_TABS = new Set(['overview', 'matches', 'season', 'tournaments', 'h2h', 'performance', 'statistics', 'ranking', 'clay', 'hard', 'grass']);
      const isSurfaceTab = tab === 'clay' || tab === 'hard' || tab === 'grass';
      if (tab === 'matches') {
        return { index: false, follow: true };
      }
      if (isSurfaceTab && !isTop100Allowed) {
        return { index: false, follow: true };
      }
      if (tab && !VALID_TABS.has(String(tab).toLowerCase())) {
        return { index: false, follow: true };
      }
      if (tab === 'tournaments' || tab === 'statistics' || tab === 'performance') {
        return { index: false, follow: true };
      }
      if (tab === 'ranking') {
        const allowlist = getRankingAllowlist();
        const inList = allowlist.has(name);
        return { index: inList, follow: true };
      }
      return { index: true, follow: true };
    })(),
    alternates: { canonical },
  } as Metadata;
}

export default async function PlayerTabPage({ params, searchParams, _surfacePreviewNode, _surfaceTab }: any) {
  // Removed development debug logs
  const { id: slugParam, tab: tabParam } = await params;
  // Removed development debug logs
  if (!slugParam) return <div>Player ID not provided</div>;

  const isSlug = !/^\d+$/.test(String(slugParam));

  // Resolve incoming search params so we can compute a server-side heading that reflects active filters
  const resolvedSearchParams = await searchParams;
  const resolvedParamsObj: Record<string, any> =
    resolvedSearchParams instanceof URLSearchParams
      ? Object.fromEntries(resolvedSearchParams.entries())
      : (resolvedSearchParams || {});

  // PLAYER
  let player: any = null;
  const playerSelect = { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true, hand: true, backhand: true, height: true, weight: true, turnedpro: true, coaches: true } as const;
  if (!isSlug) {
    player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: playerSelect });
  } else {
    player = await prisma.player.findUnique({ where: { slug: String(slugParam).toLowerCase() }, select: playerSelect });
    // Fallback: legacy codes (e.g. C274, H377) → resolve via slug-map
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
        // ignore: best-effort
      }
    }
  }

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Redirect to canonical slug URL: handles numeric IDs, legacy codes (e.g. P0FU) and case mismatches.
  if (player.slug && String(slugParam) !== player.slug) {
    const qs = new URLSearchParams(resolvedParamsObj).toString();
    permanentRedirect(`/players/${player.slug}/${tabParam ?? 'overview'}${qs ? `?${qs}` : ''}`);
  }

  // Determine tab for SEO (use 'overview' when missing) and fetch matches server-side for JSON-LD
  const tab = tabParam ?? 'overview';
  const effectiveTab = _surfaceTab ?? tab;

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

  // Build lightweight server-side facets for the filter panel to avoid a client fetch
  let serverFacets: any = null;
  let seoSummary: any = null;
  try {
    const whereAll: any = { OR: [{ winner_id: player.id }, { loser_id: player.id }] };
    const yearsRows = await prisma.match.groupBy({ by: ['year'], where: whereAll, _count: { _all: true } });
    const surfacesRows = await prisma.match.groupBy({ by: ['surface'], where: whereAll, _count: { _all: true } });
    const levelsRows = await prisma.match.groupBy({ by: ['tourney_level'], where: whereAll, _count: { _all: true } });
    const roundsRows = await prisma.match.groupBy({ by: ['round'], where: whereAll, _count: { _all: true } });
    const bestOfRows = await prisma.match.groupBy({ by: ['best_of'], where: whereAll, _count: { _all: true } });
    const tourneyRows = await prisma.match.groupBy({ by: ['tourney_id'], where: whereAll, _count: { _all: true } });
    const tourneyNameRows = await prisma.match.groupBy({ by: ['tourney_id', 'tourney_name'], where: whereAll, _count: { _all: true } });

    const years = (yearsRows || []).filter(r => r.year != null).map(r => ({ value: r.year, count: (r as any)._count?._all ?? 0 })).sort((a,b) => (b.value as number) - (a.value as number));
    const surfaces = (surfacesRows || []).map(r => ({ value: r.surface ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));
    const levels = (levelsRows || []).map(r => ({ value: r.tourney_level ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));
    const rounds = (roundsRows || []).map(r => ({ value: r.round ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));
    const bestOf = (bestOfRows || []).map(r => ({ value: r.best_of ?? 0, count: (r as any)._count?._all ?? 0 }));

    let tourneys = (tourneyRows || []).map(r => ({ id: String(r.tourney_id ?? '').trim(), count: (r as any)._count?._all ?? 0 })).filter(t => t.id);

    // Build name map from player's own match rows (not global tournament table)
    const nameMap = new Map<string, string[]>();
    tourneyNameRows.forEach(r => {
      const id = String(r.tourney_id ?? '').trim();
      const raw = resolveTourneyName(r.tourney_name);
      if (!id || !raw) return;
      const list = nameMap.get(id) ?? [];
      if (!list.includes(raw)) list.push(raw);
      nameMap.set(id, list);
    });

    // Resolve slugs (best-effort) for links
    let tourneySlugMap: Record<string, any> = {};
    try {
      const idParts = Array.from(new Set(tourneys.map(t => {
        const parts = String(t.id).split('-').filter(Boolean);
        return parts.length === 2 ? parts[1] : t.id;
      }))).filter(Boolean);
      if (idParts.length) {
        const tours = await prisma.tournament.findMany({ where: { id: { in: idParts.map(v => Number(v)) } }, select: { id: true, slug: true } });
        tourneySlugMap = tours.reduce((acc: Record<string, any>, t: any) => { acc[String(t.id)] = { slug: t.slug ?? null }; return acc; }, {});
      }
    } catch (e) {
      tourneySlugMap = {};
    }

    let tourneysWithNames = tourneys.map(t => {
      const parts = String(t.id).split('-').filter(Boolean);
      const idPart = parts.length === 2 ? parts[1] : t.id;
      const names = nameMap.get(t.id) ?? [];
      const name = names.length > 1 ? names.join(' / ') : (names[0] ?? t.id);
      return { id: t.id, name, count: t.count, slug: idPart ? (tourneySlugMap[idPart]?.slug ?? null) : null };
    });

    // Ensure unique tourney names (collapse duplicates by normalized name)
    const seenNames = new Set<string>();
    tourneysWithNames = tourneysWithNames.filter(t => {
      const rawName = (t.name ?? t.id).toString().trim();
      const key = rawName.replace(/\s+/g, ' ').toLowerCase();
      if (!key) return false;
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    tourneys = tourneys.sort((a,b) => b.count - a.count).slice(0,100);
    tourneysWithNames = tourneysWithNames.sort((a,b) => b.count - a.count).slice(0,100);

    serverFacets = { years, surfaces, levels, rounds, tourneys: tourneysWithNames, bestOf };

    // Build a lightweight SEO summary (counts and surface wins/losses) to avoid fetching full match rows
    const total = await prisma.match.count({ where: whereAll });
    const wins = await prisma.match.count({ where: { winner_id: player.id, status: true } });
    const losses = await prisma.match.count({ where: { loser_id: player.id, status: true } });

    const winsBySurfaceRows = await prisma.match.groupBy({ by: ['surface'], where: { winner_id: player.id, status: true }, _count: { _all: true } });
    const lossesBySurfaceRows = await prisma.match.groupBy({ by: ['surface'], where: { loser_id: player.id, status: true }, _count: { _all: true } });

    const surfaceWins: Record<string, number> = {};
    (winsBySurfaceRows || []).forEach(r => { if (r.surface) surfaceWins[String(r.surface)] = (r as any)._count?._all ?? 0; });
    const surfaceLosses: Record<string, number> = {};
    (lossesBySurfaceRows || []).forEach(r => { if (r.surface) surfaceLosses[String(r.surface)] = (r as any)._count?._all ?? 0; });

    seoSummary = { total, wins, losses, surfaceWins, surfaceLosses };
  } catch (e) {
    serverFacets = null;
    seoSummary = null;
  }

  // If server-side facet computation failed for any reason, fallback to calling the internal
  // lightweight facets API so SSR still passes full filter options to the client.
  if (!serverFacets) {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://stats.tennismylife.org';
      const resFacets = await fetch(`${base}/api/players/match-facets?id=${player.id}`, { cache: 'force-cache' });
      if (resFacets.ok) {
        serverFacets = await resFacets.json();
      }
    } catch (e) {
      // no-op: leave serverFacets null; client will fetch as fallback
    }
  }

  // Use the precomputed SEO summary for totals (avoid fetching all match rows)
  const careerWins = seoSummary?.wins ?? 0;
  const careerLosses = seoSummary?.losses ?? 0;

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

      // Centralize preview behavior: fetch the preview slice from the public API so
      // all filtering, enrichment and limits are implemented in one place (avoid duplicate logic).
      try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://stats.tennismylife.org';
        const qs = new URLSearchParams();
        qs.set('id', String(player.id));
        qs.set('limit', '10');
        if (whereClause.year) qs.set('year', String(whereClause.year));
        if (whereClause.surface && typeof whereClause.surface === 'object' && 'contains' in whereClause.surface) qs.set('surface', String(whereClause.surface.contains));
        // Use relative URL so SSR fetch hits whichever host rendered this page
        // (dev, test, or prod) instead of hardcoding the production domain.
        const url = `/api/players/allmatches?${qs.toString()}`;
        // For SSR preview slice we used to cache aggressively, which could
        // return very stale results (as seen when the page initially showed
        // 1980s matches). Always fetch fresh data here – the API itself
        // is already cache-controlled so this does not hit the DB on every
        // request.
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          allMatchesForSSR = await res.json();
        } else {
          // Fallback to direct DB query on non-OK responses
          allMatchesForSSR = await prisma.match.findMany({ where: whereClause, orderBy: { tourney_date: 'desc' }, take: 10 });
        }
      } catch (e) {
        // If API fetch fails for any reason (network, DNS, etc.), fall back to querying DB directly
        try {
          allMatchesForSSR = await prisma.match.findMany({ where: whereClause, orderBy: { tourney_date: 'desc' }, take: 10 });
        } catch (err) {
          allMatchesForSSR = null;
        }
      }

      // Enrich with slugs (players + tournaments) so client links can prefer slugs
      if (allMatchesForSSR && allMatchesForSSR.length) {
        const playerIds = Array.from(
          new Set(
            allMatchesForSSR.flatMap((m) => [m.winner_id, m.loser_id]).filter(Boolean)
          )
        );
        try {
          const { mapIdsToSlugs } = await import('@/lib/player-slugs');
          const slugMap = await mapIdsToSlugs(playerIds as string[]);

          // Best-effort: resolve tournament slugs (fallback to synthetic slug from name)
          let tourneyMap: Record<string, string | null> = {};
          try {
            const tourneyIdParts = Array.from(new Set(allMatchesForSSR.map((m: any) => {
              const s = String(m.tourney_id || '').trim();
              const parts = s.split('-').filter(Boolean);
              return parts.length === 2 ? parts[1] : s;
            }).filter(Boolean)));

            if (tourneyIdParts.length) {
              const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map(v => Number(v)) } }, select: { id: true, slug: true, name: true } });
              tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? createSlug(t.name ?? String(t.id)); return acc; }, {});
            }
          } catch (e) {
            tourneyMap = {};
          }

          allMatchesForSSR = allMatchesForSSR.map((m: any) => ({
            ...m,
            winner_slug: m.winner_id ? slugMap[String(m.winner_id)] ?? null : null,
            loser_slug: m.loser_id ? slugMap[String(m.loser_id)] ?? null : null,
            tourney_slug: (() => {
              const s = String(m.tourney_id || '').trim();
              const parts = s.split('-').filter(Boolean);
              const idPart = parts.length === 2 ? parts[1] : s;
              return idPart ? (tourneyMap[String(idPart)] ?? null) : null;
            })(),
          }));
        } catch (e) {
          // ignore slug enrichment errors
        }
      }
    } catch (e) {
      // ignore match fetch errors; client will fetch if needed
    }
  }

  // ── Season tab: compute stats server-side so the client renders without any JS computation ──
  let initialSeasonStats: any = null;
  let initialSeasonYear: number | null = null;
  let initialSeasonMatches: any[] | null = null;
  let initialSeasonYears: number[] | null = null;
  if (tab === 'season') {
    const sp: Record<string, any> = resolvedParamsObj || {};
    const yearParam = sp?.year ? Number(sp.year) : null;
    if (yearParam && player) {
      try {
        // Fetch year matches + full years list in parallel
        const [raw, yearsGroupBy] = await Promise.all([
          prisma.match.findMany({
            where: {
              status: true,
              year: yearParam,
              OR: [{ winner_id: player.id }, { loser_id: player.id }],
            },
            select: {
              status: true, year: true, tourney_name: true, tourney_date: true,
              round: true, winner_id: true, loser_id: true, surface: true,
              tourney_level: true, tourney_id: true, winner_rank: true,
              loser_rank: true, score: true, team_event: true,
              // serve stats — required for Summary Season MS/Hld%/Brk%/A%/DF%/1stIn/1st%/2nd%/SPW/RPW/TPW/DR
              w_svpt: true, w_ace: true, w_df: true, w_1stIn: true, w_1stWon: true,
              w_2ndWon: true, w_SvGms: true, w_bpSaved: true, w_bpFaced: true,
              l_svpt: true, l_ace: true, l_df: true, l_1stIn: true, l_1stWon: true,
              l_2ndWon: true, l_SvGms: true, l_bpSaved: true, l_bpFaced: true,
            }
          }),
          prisma.match.groupBy({
            by: ['year'],
            where: { status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }] },
            _count: { _all: true },
          }),
        ]);

        // Serialize for server→client: convert Date→ISO string, IDs→string
        let serialized = raw.map((m: any) => ({
          ...m,
          tourney_date: m.tourney_date instanceof Date ? m.tourney_date.toISOString() : (m.tourney_date ?? null),
          winner_id: m.winner_id != null ? String(m.winner_id) : null,
          loser_id:  m.loser_id  != null ? String(m.loser_id)  : null,
        }));

        // Enrich serialized matches with `tourney_slug` when possible so
        // client components (TournamentGrid / TourneyCard) can prefer slug
        // links instead of falling back to numeric/composite ids.
        try {
          const tourneyIdParts = Array.from(new Set(serialized.map((m: any) => {
            const s = String(m.tourney_id || '').trim();
            const parts = s.split('-').filter(Boolean);
            return parts.length === 2 ? parts[1] : s;
          }).filter(Boolean)));

          if (tourneyIdParts.length) {
            const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map(v => Number(v)) } }, select: { id: true, slug: true, name: true } });
            const tourneyMap: Record<string, string | null> = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? createSlug(t.name ?? String(t.id)); return acc; }, {});

            serialized = serialized.map((m: any) => {
              const s = String(m.tourney_id || '').trim();
              const parts = s.split('-').filter(Boolean);
              const idPart = parts.length === 2 ? parts[1] : s;
              return { ...m, tourney_slug: idPart ? (tourneyMap[String(idPart)] ?? null) : null };
            });
          } else {
            serialized = serialized.map((m: any) => ({ ...m, tourney_slug: null }));
          }
        } catch (e) {
          // Best-effort: if enrichment fails, ensure field exists to avoid runtime errors
          serialized = serialized.map((m: any) => ({ ...m, tourney_slug: null }));
        }

        initialSeasonMatches = serialized;
        initialSeasonYears = (yearsGroupBy || [])
          .map((r: any) => r.year as number)
          .filter((y: any) => typeof y === 'number')
          .sort((a: number, b: number) => b - a);

        const { computeYearStats } = await import('../season/components/computeYearStats');
        const computed = computeYearStats(serialized as any[], yearParam, String(player.id));
        // Serialize Date objects inside tourneysForYear
        initialSeasonStats = {
          ...computed,
          tourneysForYear: computed.tourneysForYear.map((t: any) => ({
            ...t,
            date: t.date instanceof Date ? t.date.toISOString() : t.date,
          })),
        };
        initialSeasonYear = yearParam;
      } catch (e) {
        // SSR stats failed; client will compute on its own
      }
    }
  }

  // Render SEO script BEFORE the client component (must be server-rendered)
  const playerName = player.atpname || player.player;
  const rankingFaqJsonLd = tab === 'ranking' ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is ${playerName}'s career peak ATP ranking?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `You can find ${playerName}'s career peak ATP ranking in the ranking history chart and stats on this page, which tracks every week-by-week position since the start of their professional career.`,
        },
      },
      {
        '@type': 'Question',
        name: `How many weeks has ${playerName} spent at No. 1 in the ATP rankings?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The total number of weeks ${playerName} has held the No. 1 ATP ranking is shown in the ranking statistics section on this page, along with a breakdown of consecutive and non-consecutive weeks.`,
        },
      },
      {
        '@type': 'Question',
        name: `When did ${playerName} first enter the ATP Top 10?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The date when ${playerName} first broke into the ATP Top 10 is visible on the ranking history chart available on this page, showing the full career trajectory from debut to peak.`,
        },
      },
      {
        '@type': 'Question',
        name: `How many weeks has ${playerName} spent inside the ATP Top 10?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The total weeks ${playerName} has ranked inside the ATP Top 10 are summarised in the ranking stats on this page, which also breaks down time spent at every ranking tier.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is ${playerName}'s current ATP ranking?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${playerName}'s current ATP ranking is displayed at the top of this page and updated weekly. The full week-by-week history is shown in the interactive chart below.`,
        },
      },
    ],
  } : null;

  return (
    <>
      {rankingFaqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rankingFaqJsonLd) }}
        />
      )}
      <SEOPlayer
        playerId={player.id}
        slug={player.slug}
        name={player.atpname || player.player}
        atpname={player.atpname}
        birthdate={player.birthdate ? (player.birthdate instanceof Date ? player.birthdate.toISOString() : String(player.birthdate)) : undefined}
        ioc={player.ioc}
        birthplace={player.birthplace}
        tab={effectiveTab}
        // Prefer server-side precomputed summary to avoid fetching all match rows
        summary={seoSummary}
      />

      {!_surfacePreviewNode && <SEOBreadcrumb slug={player.slug} name={player.atpname || player.player} tab={effectiveTab} />}

      <PlayerClient
        params={{ id: player.id, tab: effectiveTab }}
        initialPlayer={player}
        initialMatches={allMatchesForSSR ?? undefined}
        initialFacets={serverFacets ?? undefined}
        initialHeading={matchesHeading ?? 'Matches'}
        initialTotals={{ totalWins: careerWins, totalLosses: careerLosses }}
        initialSeasonStats={initialSeasonStats ?? undefined}
        initialSeasonYear={initialSeasonYear ?? undefined}
        initialSeasonMatches={initialSeasonMatches ?? undefined}
        initialSeasonYears={initialSeasonYears ?? undefined}
        overviewSlot={tab === 'season' ? undefined : (_surfacePreviewNode ?? undefined)}
        belowTabsSlot={((tab === 'season' && _surfacePreviewNode) || (allMatchesForSSR && allMatchesForSSR.length)) ? (
          <>
            {tab === 'season' ? (_surfacePreviewNode ?? null) : null}
            {allMatchesForSSR && allMatchesForSSR.length ? (
              <AllMatchesServer
                playerId={player.id}
                playerSlug={player.slug}
                matches={allMatchesForSSR}
                heading={matchesHeading}
                playerLinkTab={effectiveTab}
              />
            ) : null}
          </>
        ) : null}
        bottomSlot={((tab === 'season' && _surfacePreviewNode) || (allMatchesForSSR && allMatchesForSSR.length)) ? (
          <>
            {tab === 'season' ? (_surfacePreviewNode ?? null) : null}
            {allMatchesForSSR && allMatchesForSSR.length ? (
              <AllMatchesServer
                playerId={player.id}
                playerSlug={player.slug}
                matches={allMatchesForSSR}
                heading={matchesHeading}
                playerLinkTab={effectiveTab}
              />
            ) : null}
          </>
        ) : null}
        rankingNarrative={
          tab === 'ranking' ? (
            <RankingNarrativeServer
              playerId={player.id}
              birthdate={player.birthdate ? (player.birthdate instanceof Date ? player.birthdate.toISOString() : String(player.birthdate)) : null}
              playerName={player.atpname || player.player}
              className="mb-8"
            />
          ) : undefined
        }
        serverBanner={
          <div className="flex flex-col w-full">
            <CurrentRankingBanner playerId={player.id} />
            <h1 className="text-3xl font-bold text-center w-full">
              {player.atpname || player.player} ATP Ranking
            </h1>
          </div>
        }
      />

      {tab === 'matches' && (
        <p className="sr-only">{matchesHeading}</p>
      )}
    </>
  );
}
