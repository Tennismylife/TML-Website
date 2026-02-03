import React from 'react';
import PlayerTabPage from '../[tab]/page';
import { redirect } from 'next/navigation';

export default async function SeasonIndexPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const { id } = resolvedParams ?? {};

  if (!id) {
    try {
      const hdrModule = await import('next/headers');
      const h = await hdrModule.headers();
      const hdrs: Record<string, string | undefined> = {};
      try { for (const [k, v] of h.entries()) hdrs[k] = v; } catch(e) { /* ignore */ }
      console.error('[SeasonIndexPage] missing id', { params: resolvedParams, searchParams: resolvedSearch, headers: hdrs });
    } catch (e) {
      try { console.error('[SeasonIndexPage] missing id', { params: resolvedParams, searchParams: resolvedSearch }); } catch (e2) {}
    }

    return <div className="text-red-500 font-bold">Player not found</div>;
  }

  // If a year query param is present, render the season page normally
  const yearParam = resolvedSearch && (resolvedSearch.year || (resolvedSearch.get && resolvedSearch.get('year')));
  if (yearParam) {
    return <PlayerTabPage params={Promise.resolve({ id, tab: 'season' })} searchParams={Promise.resolve(resolvedSearch ?? {})} />;
  }

  // Otherwise, attempt to find the latest year and perform a client-side redirect
  let player: any = null;
  let latestYear: number | null = null;

  try {
    // Dynamically import prisma to avoid issues in some dev environments
    let prisma: any;
    try { ({ prisma } = await import('../../../../lib/prisma')); } catch (e) { console.error('[SeasonIndexPage] prisma import failed', e); return <PlayerTabPage params={Promise.resolve({ id, tab: 'season' })} searchParams={Promise.resolve(resolvedSearch ?? {})} />; }

    const isSlug = !/^\d+$/.test(String(id));
    player = isSlug
      ? await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { id: true, slug: true } })
      : await prisma.player.findUnique({ where: { id: String(id) }, select: { id: true, slug: true } });

    if (!player) return <PlayerTabPage params={Promise.resolve({ id, tab: 'season' })} searchParams={Promise.resolve(resolvedSearch ?? {})} />;

    const agg = await prisma.match.aggregate({ _max: { year: true }, where: { status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }] } });
    // Defer redirect until after try/catch so NEXT_REDIRECT isn't caught and logged
    const latestYearCandidate = agg._max?.year ?? null;
    if (latestYearCandidate) {
      latestYear = latestYearCandidate;
    }
  } catch (e) {
    console.error('[SeasonIndexPage] error finding latest season', e);
  }

  if (latestYear) {
    const slug = player.slug || String(id);
    const to = `/players/${encodeURIComponent(slug)}/season/${latestYear}`;
    // Server-side redirect to canonical per-year path for SEO
    redirect(to);
  }

  // Fallback: render season page without redirect
  return <PlayerTabPage params={Promise.resolve({ id, tab: 'season' })} searchParams={Promise.resolve(resolvedSearch ?? {})} />;
}
