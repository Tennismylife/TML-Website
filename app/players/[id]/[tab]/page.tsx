import React from 'react';
import PlayerClient from '../PlayerClient';
import SEOPlayer from '../SEOPlayer';
import SEOBreadcrumb from '../SEOBreadcrumb';
import AllMatchesServer from '../Matches/AllMatchesServer';
import { prisma } from '../../../../lib/prisma';
import { redirect } from 'next/navigation';
import { getPlayerHref } from '@/lib/utils';
import type { Metadata } from 'next';

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

export const dynamic = 'force-dynamic';

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

  // If on matches tab and filters are active, make canonical self-referencing by including normalized query params
  if (tab === 'matches') {
    // Build a deterministic query string from meaningful params (exclude tab and empty/'All' values)
    const entries = Object.entries(spForCanonical || {})
      .filter(([k, v]) => k !== 'tab' && v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'All')
      .map(([k, v]) => [k, String(v)]);

    if (entries.length) {
      // Sort keys for deterministic canonical value
      entries.sort(([a], [b]) => a.localeCompare(b));
      const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      canonical = `${canonical}?${qs}`;
    }
  }

  const parts = tab === 'matches'
    ? ['Stats', 'Matches', 'Results', 'Records & Rankings']
    : ['Stats', 'Overview', 'Records & Rankings'];

  // If on matches tab, build a title that mirrors the H1 (player name + heading)
  let title = `${name} – ${parts.join(', ')} | TennisMyLife`;
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
    if (hasFilters) title = `${name} — ${heading}`;
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

  metaDescription = `Complete statistics for ${name}: ATP results, ${tab === 'matches' ? '2026 matches, ' : ''}career record, rankings, titles, head-to-head records, and surface performance. Updated as of 2026.`;
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
    // If the page has 4 or more active query filters, mark it as noindex to avoid indexing
    // combinations of filters that create thin/duplicate pages.
    robots: ((): { index: boolean; follow: boolean } => {
      const resolvedSearchParamsForRobots = spForCanonical ?? {} as Record<string, any>;
      const isActive = (v: any) => v != null && String(v).trim() !== '' && String(v) !== 'All';
      const activeCount = Object.entries(resolvedSearchParamsForRobots).filter(([k, v]) => k !== 'tab' && isActive(v)).length;
      // noindex when 4 or more active filters
      return activeCount >= 4 ? { index: false, follow: true } : { index: true, follow: true };
    })(),
    alternates: { canonical },
  } as Metadata;
}

export default async function PlayerTabPage({ params, searchParams }: any) {
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
  if (!isSlug) {
    player = await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } });
  } else {
    player = await prisma.player.findUnique({ where: { slug: String(slugParam).toLowerCase() }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } });
    // Fallback: legacy codes (e.g. C274, H377) → resolve via slug-map
    if (!player) {
      try {
        const apiUrl = 'https://stats.tennismylife.org/api/slug-map';
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
        if (apiResp.ok) {
          const maps = await apiResp.json();
          const mapped = maps?.players?.[String(slugParam).toUpperCase()];
          if (mapped) {
            player = await prisma.player.findUnique({ where: { slug: mapped }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } });
          }
        }
      } catch (e) {
        // ignore: best-effort
      }
    }
  }

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Previously we redirected numeric IDs to slug paths here. To avoid redirects, render the page
  // inline for both slug and numeric IDs. Do not perform any redirect for numeric IDs.
  // (No-op)

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
        const url = `${base}/api/players/allmatches?${qs.toString()}`;
        const res = await fetch(url, { cache: 'force-cache' });
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
        const serialized = raw.map((m: any) => ({
          ...m,
          tourney_date: m.tourney_date instanceof Date ? m.tourney_date.toISOString() : (m.tourney_date ?? null),
          winner_id: m.winner_id != null ? String(m.winner_id) : null,
          loser_id:  m.loser_id  != null ? String(m.loser_id)  : null,
        }));
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
        // Prefer server-side precomputed summary to avoid fetching all match rows
        summary={seoSummary}
      />

      <SEOBreadcrumb slug={player.slug} name={player.atpname || player.player} tab={tab} />

      {/* Server-rendered matches table for SSR (visible in HTML when matches tab) */}
      {tab === 'matches' && (
        <h1 className="sr-only">{matchesHeading}</h1>
      )}
      {allMatchesForSSR && allMatchesForSSR.length ? (
        <AllMatchesServer playerId={player.id} matches={allMatchesForSSR} heading={matchesHeading} />
      ) : null}

      <PlayerClient params={{ id: player.id, tab: tabParam ?? 'matches' }} initialMatches={allMatchesForSSR ?? undefined} initialFacets={serverFacets ?? undefined} initialHeading={matchesHeading ?? 'Matches'} initialTotals={{ totalWins: careerWins, totalLosses: careerLosses }} initialSeasonStats={initialSeasonStats ?? undefined} initialSeasonYear={initialSeasonYear ?? undefined} initialSeasonMatches={initialSeasonMatches ?? undefined} initialSeasonYears={initialSeasonYears ?? undefined} />
    </>
  );
}
