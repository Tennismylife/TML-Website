import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PlayerTabPage from './[tab]/page';
import { getPlayerTop100Robots } from './playerIndexing';

async function resolvePlayer(id: string) {
  const isSlug = !/^\d+$/.test(String(id));
  if (isSlug) {
    return prisma.player.findUnique({
      where: { slug: String(id).toLowerCase() },
      select: { id: true, atpname: true, player: true, slug: true },
    });
  }
  return prisma.player.findUnique({
    where: { id: String(id) },
    select: { id: true, atpname: true, player: true, slug: true },
  });
}

export type SurfaceKey = 'Clay' | 'Hard' | 'Grass';

const SURFACE_META: Record<SurfaceKey, { label: string; adjective: string }> = {
  Clay:  { label: 'Clay Court',  adjective: 'clay'  },
  Hard:  { label: 'Hard Court',  adjective: 'hard'  },
  Grass: { label: 'Grass Court', adjective: 'grass' },
};

export async function generateSurfaceMetadata(id: string, surface: SurfaceKey): Promise<Metadata> {
  let player: any = null;
  try { player = await resolvePlayer(id); } catch (e) {}
  const name = player ? (player.atpname || player.player) : String(id);
  const slug = player?.slug || String(id);
  const surfPath = surface.toLowerCase();
  const { label, adjective } = SURFACE_META[surface];
  const title = `${name} ${label} Stats & Match Results`;

  // Fetch real stats for dynamic meta description
  let metaWins = 0, metaLosses = 0, metaTitles = 0;
  try {
    if (player) {
      const [w, l, t] = await Promise.all([
        prisma.match.count({ where: { status: true, winner_id: player.id, surface: { contains: surface, mode: 'insensitive' } } }),
        prisma.match.count({ where: { status: true, loser_id: player.id, surface: { contains: surface, mode: 'insensitive' } } }),
        prisma.match.count({ where: { status: true, winner_id: player.id, round: 'F', surface: { contains: surface, mode: 'insensitive' }, team_event: { not: true }, NOT: { score: { contains: 'WEA' } } } }),
      ]);
      metaWins = w; metaLosses = l; metaTitles = t;
    }
  } catch (e) {}
  const metaTotal = metaWins + metaLosses;
  const metaWinPct = metaTotal > 0 ? `${((metaWins / metaTotal) * 100).toFixed(1)}%` : '0%';
  const description = metaTotal > 0
    ? `${name} ${adjective} court record: ${metaWins}–${metaLosses} (${metaWinPct}), ${metaTitles} title${metaTitles !== 1 ? 's' : ''}. Full ATP ${adjective} stats on TennisMyLife.`
    : `${name} career ${adjective} court stats: win-loss record by year, categories, ranking performance, rounds, sets and complete match history. Full ATP data on TennisMyLife.`;
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/${surfPath}`;
  const imageUrl = `https://stats.tennismylife.org/og/${encodeURIComponent(slug)}.png`;
  const top100Robots = await getPlayerTop100Robots(String(id));
  const nameParts = name.split(/\s+/).filter(Boolean);
  const ogProfile: Record<string, string> = { username: slug };
  if (nameParts[0]) ogProfile.firstName = nameParts[0];
  if (nameParts.length > 1) ogProfile.lastName = nameParts[nameParts.length - 1];
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        'x-default': canonical,
      },
    },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${name} ${adjective} court stats` }],
      profile: ogProfile,
    },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [{ url: imageUrl, alt: `${name} ${adjective} stats` }] },
    robots: top100Robots,
    keywords: `${name} ${adjective}, ${name} ${adjective} stats, ${name} ${adjective} court, ${name} ${label.toLowerCase()} record, ATP ${adjective}, ${name} matches ${adjective}`,
  } as Metadata;
}

interface SurfacePageContentProps {
  id: string;
  surface: SurfaceKey;
}

export default async function SurfacePageContent({ id, surface }: SurfacePageContentProps) {
  let player: any = null;
  try { player = await resolvePlayer(id); } catch (e) {}
  if (!player) return <div className="text-red-500 font-bold">Player not found</div>;

  const displayName = player.atpname || player.player;
  const slug = player.slug || String(id);
  const surfPath = surface.toLowerCase();
  const { label, adjective } = SURFACE_META[surface];
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/${surfPath}`;

  // SSR aggregate counts for SEO paragraph and JSON-LD
  let totalMatches = 0, wins = 0, losses = 0;
  let titles: string[] = [];
  let totalTitles = 0;

  // Extended stats for rich narrative
  let slamWins = 0, slamLosses = 0;
  let mastersWins = 0, mastersLosses = 0;
  let finalsReached = 0;
  let sfReached = 0;
  let qfReached = 0;
  let top10Wins = 0, top10Losses = 0;
  let bo5Wins = 0, bo5Losses = 0;
  let bo3Wins = 0, bo3Losses = 0;
  let bestYear = '';
  let bestYearWins = 0;
  let bestYearTotal = 0;
  let winStreak = 0;
  let bySeason: Record<number, { w: number; l: number; titles: number; finals: number; sf: number; qf: number; r16: number; r32: number; r64: number; r128: number }> = {};
  const currentYear = new Date().getFullYear();
  let recentFormStr: string[] = [];

  try {
    totalMatches = await prisma.match.count({
      where: {
        status: true,
        surface: { contains: surface, mode: 'insensitive' },
        OR: [{ winner_id: player.id }, { loser_id: player.id }],
      },
    });
    wins = await prisma.match.count({
      where: { status: true, winner_id: player.id, surface: { contains: surface, mode: 'insensitive' } },
    });
    losses = totalMatches - wins;

    const surfaceWhere = { status: true, surface: { contains: surface, mode: 'insensitive' as const } };

    // Titles (finals won)
    const finals = await prisma.match.findMany({
      where: {
        ...surfaceWhere,
        winner_id: player.id,
        round: 'F',
        team_event: { not: true },
        NOT: { score: { contains: 'WEA' } },
      },
      select: { tourney_name: true },
    });
    totalTitles = finals.length;
    const rawTitles = (finals || []).map((f: any) => {
      if (!f?.tourney_name) return null;
      if (typeof f.tourney_name === 'string') return f.tourney_name;
      if (typeof f.tourney_name === 'object') return f.tourney_name.en || Object.values(f.tourney_name)[0] || null;
      return String(f.tourney_name);
    }).filter(Boolean) as string[];
    titles = Array.from(new Set(rawTitles));

    // All matches with extra fields for extended stats
    const allSurfMatches = await prisma.match.findMany({
      where: { ...surfaceWhere, OR: [{ winner_id: player.id }, { loser_id: player.id }] },
      select: {
        winner_id: true, loser_id: true,
        tourney_level: true, round: true,
        winner_rank: true, loser_rank: true,
        best_of: true, year: true,
        tourney_date: true,
      },
      orderBy: { tourney_date: 'asc' },
    });

    // Grand Slams, Masters
    for (const m of allSurfMatches) {
      const isWin = String(m.winner_id) === String(player.id);
      if (m.tourney_level === 'G') { isWin ? slamWins++ : slamLosses++; }
      if (m.tourney_level === 'M') { isWin ? mastersWins++ : mastersLosses++; }
      if (m.best_of === 5) { isWin ? bo5Wins++ : bo5Losses++; }
      if (m.best_of === 3) { isWin ? bo3Wins++ : bo3Losses++; }
      // Top 10 wins: player beat a top10 opp, or lost to one
      const oppRank = isWin ? m.loser_rank : m.winner_rank;
      if (oppRank != null && oppRank <= 10) { isWin ? top10Wins++ : top10Losses++; }
    }

    // Finals / SF / QF reached (as winner or loser)
    finalsReached = allSurfMatches.filter(m =>
      m.round === 'F' && (String(m.winner_id) === String(player.id) || String(m.loser_id) === String(player.id))
    ).length;
    sfReached = allSurfMatches.filter(m =>
      m.round === 'SF' && (String(m.winner_id) === String(player.id) || String(m.loser_id) === String(player.id))
    ).length;
    qfReached = allSurfMatches.filter(m =>
      m.round === 'QF' && (String(m.winner_id) === String(player.id) || String(m.loser_id) === String(player.id))
    ).length;

    // Best season on this surface (also tracks rounds for the matrix table)
    bySeason = {};
    for (const m of allSurfMatches) {
      const y = m.year as number;
      if (!y) continue;
      if (!bySeason[y]) bySeason[y] = { w: 0, l: 0, titles: 0, finals: 0, sf: 0, qf: 0, r16: 0, r32: 0, r64: 0, r128: 0 };
      const isW = String(m.winner_id) === String(player.id);
      isW ? bySeason[y].w++ : bySeason[y].l++;
      if (m.round === 'F')    { bySeason[y].finals++; if (isW) bySeason[y].titles++; }
      if (m.round === 'SF')   bySeason[y].sf++;
      if (m.round === 'QF')   bySeason[y].qf++;
      if (m.round === 'R16')  bySeason[y].r16++;
      if (m.round === 'R32')  bySeason[y].r32++;
      if (m.round === 'R64')  bySeason[y].r64++;
      if (m.round === 'R128') bySeason[y].r128++;
    }
    let bestPct = -1;
    for (const [y, rec] of Object.entries(bySeason)) {
      const total = rec.w + rec.l;
      if (total < 5) continue; // skip seasons with too few matches
      const pct = rec.w / total;
      if (pct > bestPct) { bestPct = pct; bestYear = y; bestYearWins = rec.w; bestYearTotal = total; }
    }

    // Longest win streak on this surface
    let curStreak = 0;
    for (const m of allSurfMatches) {
      if (String(m.winner_id) === String(player.id)) {
        curStreak++;
        if (curStreak > winStreak) winStreak = curStreak;
      } else {
        curStreak = 0;
      }
    }

    // Recent form: current year
    const recentYearMatches = allSurfMatches.filter(m => (m.year as number) === currentYear);
    recentFormStr = recentYearMatches.slice(-10).map(m => String(m.winner_id) === String(player.id) ? 'W' : 'L');
  } catch (e) {}

  const winPct = totalMatches > 0 ? `${((wins / totalMatches) * 100).toFixed(1)}%` : '0%';
  const heading = `${displayName} ${label} Stats & Match Results`;
  const pageTitle = heading;
  const canonicalOrigin = new URL(canonical).origin;

  const pageDescription = totalMatches > 0
    ? `${displayName} ${adjective} court record: ${wins}–${losses} (${winPct}), ${totalTitles} title${totalTitles !== 1 ? 's' : ''}. Full ATP ${adjective} stats, match history, rankings and analysis on TennisMyLife.`
    : `${displayName} career ${adjective} court stats: win-loss record by year, categories, ranking performance, rounds, sets and complete match history. Full ATP data on TennisMyLife.`;
  const aboutArr = [{ "@id": `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}` }];
  const keywords = `${displayName} ${adjective}, ${displayName} ${adjective} stats, ${displayName} ${adjective} court, ${displayName} ${label.toLowerCase()} record, ATP ${adjective}, ${displayName} matches ${adjective}`;
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

  const slamTotal = slamWins + slamLosses;
  const mastersTotal = mastersWins + mastersLosses;
  const top10Total = top10Wins + top10Losses;
  const bo5Total = bo5Wins + bo5Losses;
  const bo3Total = bo3Wins + bo3Losses;

  const recentYearRec = bySeason[currentYear] ?? { w: 0, l: 0 };
  const recentYearTotal = recentYearRec.w + recentYearRec.l;

  // Narrative proportion helpers — all thresholds driven by actual stats
  const winRateN = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const slamWinPctN = slamTotal > 0 ? (slamWins / slamTotal) * 100 : 0;
  const mastersWinPctN = mastersTotal > 0 ? (mastersWins / mastersTotal) * 100 : 0;
  const top10WinPctN = top10Total > 0 ? (top10Wins / top10Total) * 100 : 0;
  const bo5WinPctN = bo5Total > 0 ? (bo5Wins / bo5Total) * 100 : 0;
  const bo3WinPctN = bo3Total > 0 ? (bo3Wins / bo3Total) * 100 : 0;
  const titleConvRate = finalsReached > 0 ? totalTitles / finalsReached : 0;
  const recentW = recentFormStr.filter(r => r === 'W').length;
  // Win streak is only "notable" relative to career volume
  const streakThreshold = totalMatches >= 200 ? 20 : totalMatches >= 100 ? 12 : totalMatches >= 50 ? 8 : 5;
  const surfacePreviewNode = (
    <div className="mb-6 p-5 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#facc15' }}>{label} Statistics Overview</h3>

      <div className="text-sm leading-relaxed text-gray-200 space-y-3">

        {/* Overall record: tone + one insight sentence tied to win rate tier */}
        {totalMatches < 5 ? (
          <p>
            <strong>{displayName}</strong> has played only{' '}
            <strong className="text-yellow-400">{totalMatches}</strong> match{totalMatches !== 1 ? 'es' : ''} on {adjective} — too small a sample to draw firm conclusions about their ability on this surface.
          </p>
        ) : (
          <p>
            <strong>{displayName}</strong>{' '}
            {winRateN >= 75 ? `has been dominant on ${adjective}, posting` :
             winRateN >= 65 ? `has an impressive ${adjective} court record of` :
             winRateN >= 55 ? `holds a solid ${adjective} court record of` :
             winRateN >= 45 ? `has a competitive ${adjective} court record of` :
             `has found ${adjective} courts difficult, recording`}{' '}
            <strong className="text-green-400">{wins}</strong>–<strong className="text-red-400">{losses}</strong>{' '}
            across <strong className="text-yellow-400">{totalMatches}</strong> matches (<strong className="text-blue-400">{winPct}</strong>
            {winRateN >= 75 ? ' — exceptional' : winRateN >= 65 ? ' — strong' : ''}).{' '}
            {winRateN >= 75
              ? `Few players in the Open Era have sustained that level of dominance across a full career on ${adjective}.`
              : winRateN >= 65
              ? `A win rate of that calibre over ${totalMatches} matches is a reliable indicator of genuine quality on this surface.`
              : winRateN >= 55
              ? `A winning majority across ${totalMatches} matches shows consistent ability to get results on ${adjective}.`
              : winRateN >= 45
              ? `The record shows a player capable of competing here, though there is clear room to push the win rate higher.`
              : `The numbers point to a surface that has not consistently suited the game — a key area of opportunity on the calendar.`
            }
            {' '}
            {totalTitles === 0 && finalsReached > 0
              ? <>{displayName} has reached <strong className="text-yellow-400">{finalsReached}</strong> final{finalsReached !== 1 ? 's' : ''} without yet claiming a title on {adjective} — one of the finest margins in tennis.</>
              : totalTitles >= 10
              ? <>With <strong className="text-yellow-400">{totalTitles}</strong> titles, among the most prolific {adjective} court champions in the Open Era{titles.length > 0 ? `: ${titles.slice(0, 4).join(', ')}${titles.length > 4 ? ` and ${titles.length - 4} more` : ''}` : ''}.</>
              : totalTitles >= 4
              ? <><strong className="text-yellow-400">{totalTitles}</strong> titles on {adjective}{titles.length > 0 ? `: ${titles.join(', ')}` : ''} — a record that reflects consistent ability to close out tournaments on this surface.</>
              : totalTitles > 0
              ? <>Claimed <strong className="text-yellow-400">{totalTitles}</strong> title{totalTitles !== 1 ? 's' : ''} on {adjective}{titles.length > 0 ? `: ${titles.join(', ')}` : ''}.</>
              : null
            }
          </p>
        )}

        {/* Grand Slams: 5 graduated cases + one contextual sentence per tier */}
        {slamTotal > 0 && (
          <p>
            At Grand Slam level ({surface === 'Clay' ? 'Roland Garros' : surface === 'Grass' ? 'Wimbledon' : 'Australian Open & US Open'}):{' '}
            {slamWins === 0
              ? <>{displayName} has yet to record a win on {adjective} at this stage — <strong className="text-green-400">0</strong>–<strong className="text-red-400">{slamTotal}</strong> across <strong className="text-yellow-400">{slamTotal}</strong> Grand Slam match{slamTotal !== 1 ? 'es' : ''}. Breaking through here would mark a significant step forward on this surface.</>
              : slamTotal <= 3
              ? <><strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong> across just <strong className="text-yellow-400">{slamTotal}</strong> match{slamTotal !== 1 ? 'es' : ''} — still very early days at this level on {adjective}.</>
              : slamWinPctN >= 72
              ? <>{displayName} has been outstanding — <strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong> (<strong className="text-blue-400">{slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{slamTotal}</strong> matches. Winning more than 7 in 10 Grand Slam matches on {adjective} is the benchmark of an all-time great on this surface.</>
              : slamWinPctN >= 58
              ? <>a positive <strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong> (<strong className="text-blue-400">{slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{slamTotal}</strong> matches — a player who generally rises to the occasion at the Slams on {adjective}.</>
              : slamWinPctN >= 40
              ? <>{displayName} is <strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong> (<strong className="text-blue-400">{slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{slamTotal}</strong> Grand Slam matches — below .500, though the elite draw depth at the Slams makes that a notoriously difficult barrier to crack.</>
              : <>{displayName} has struggled at Grand Slam level on {adjective}: <strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong> (<strong className="text-blue-400">{slamWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{slamTotal}</strong> matches. The best-of-five format and elite fields make this the toughest benchmark on this surface.</>
            }
          </p>
        )}

        {/* Masters 1000: only if 3+ matches, 4 graduated cases + insight sentence */}
        {mastersTotal >= 3 && (
          <p>
            ATP Masters 1000 on {adjective} ({surface === 'Clay' ? 'Monte Carlo, Madrid, Rome' : surface === 'Hard' ? 'Indian Wells, Miami, Cincinnati, Shanghai, Paris' : 'Stuttgart, Halle, Queen\'s Club'}):{' '}
            {mastersWinPctN >= 65
              ? <>{displayName} is elite here — <strong className="text-green-400">{mastersWins}</strong>–<strong className="text-red-400">{mastersLosses}</strong> (<strong className="text-blue-400">{mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{mastersTotal}</strong> matches. Sustaining that win rate in the Tour's deepest regular-week draws is a defining quality of the very best on this surface.</>
              : mastersWinPctN >= 50
              ? <>a positive <strong className="text-green-400">{mastersWins}</strong>–<strong className="text-red-400">{mastersLosses}</strong> (<strong className="text-blue-400">{mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{mastersTotal}</strong> matches — winning above .500 at this level, week in week out, is a genuine sign of quality on {adjective}.</>
              : mastersWinPctN >= 35
              ? <>{displayName} is <strong className="text-green-400">{mastersWins}</strong>–<strong className="text-red-400">{mastersLosses}</strong> (<strong className="text-blue-400">{mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{mastersTotal}</strong> Masters matches — below .500 in the Tour's deepest fields. Lifting that record here would unlock better results across the whole {adjective} swing.</>
              : <>{displayName} has struggled at Masters level on {adjective}: <strong className="text-green-400">{mastersWins}</strong>–<strong className="text-red-400">{mastersLosses}</strong> (<strong className="text-blue-400">{mastersWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{mastersTotal}</strong> matches. Improving at this level is the clearest path to a stronger overall record on this surface.</>
            }
          </p>
        )}

        {/* Finals: conversion rate + SF/QF counts + insight sentence */}
        {finalsReached >= 2 && (
          <p>
            <strong className="text-yellow-400">{finalsReached}</strong> finals reached on {adjective} —{' '}
            {titleConvRate >= 0.75
              ? <>converted <strong className="text-yellow-400">{totalTitles}</strong> into titles (outstanding <strong className="text-blue-400">{(titleConvRate * 100).toFixed(0)}%</strong> conversion rate). Converting finals at that rate separates champions from contenders.</>
              : titleConvRate >= 0.5
              ? <>won <strong className="text-yellow-400">{totalTitles}</strong>, lost <strong className="text-yellow-400">{finalsReached - totalTitles}</strong> (solid <strong className="text-blue-400">{(titleConvRate * 100).toFixed(0)}%</strong> conversion) — consistently getting to finals and winning the majority is a hallmark of elite performers on {adjective}.</>
              : totalTitles === 0
              ? <>none converted into a title yet. Reaching <strong className="text-yellow-400">{finalsReached}</strong> final{finalsReached !== 1 ? 's' : ''} is a mark of real quality, but the gap between finalist and champion is one of the finest lines in the sport.</>
              : <>won <strong className="text-yellow-400">{totalTitles}</strong>, lost <strong className="text-yellow-400">{finalsReached - totalTitles}</strong> (<strong className="text-blue-400">{(titleConvRate * 100).toFixed(0)}%</strong> conversion) — capable of reaching finals consistently, with room to improve at the decisive moment.</>
            }
            {sfReached > 0 && <>{' '}<strong className="text-yellow-400">{sfReached}</strong> semifinal{sfReached !== 1 ? 's' : ''}.</>}
            {qfReached > 0 && <>{' '}<strong className="text-yellow-400">{qfReached}</strong> quarterfinal{qfReached !== 1 ? 's' : ''}.</>}
          </p>
        )}
        {finalsReached === 1 && (
          <p>
            One final reached on {adjective}{totalTitles === 1
              ? ', converted into a title — a perfect finals record on this surface.'
              : ', without converting it into a title. That final-round experience is valuable groundwork for going one step further next time.'
            }
            {sfReached > 0 && <>{' '}<strong className="text-yellow-400">{sfReached}</strong> semifinal{sfReached !== 1 ? 's' : ''}.</>}
            {qfReached > 0 && <>{' '}<strong className="text-yellow-400">{qfReached}</strong> quarterfinal{qfReached !== 1 ? 's' : ''}.</>}
          </p>
        )}
        {finalsReached === 0 && sfReached >= 2 && (
          <p>
            <strong className="text-yellow-400">{sfReached}</strong> semifinal{sfReached !== 1 ? 's' : ''} on {adjective} without yet reaching a final — consistent deep runs that show the ability to string together wins across a full draw, with the step to the final still to come.
            {qfReached > sfReached && <>{' '}<strong className="text-yellow-400">{qfReached}</strong> quarterfinal{qfReached !== 1 ? 's' : ''} adds further depth to that picture.</>}
          </p>
        )}
        {finalsReached === 0 && sfReached <= 1 && qfReached >= 4 && (
          <p>
            <strong className="text-yellow-400">{qfReached}</strong> quarterfinal{qfReached !== 1 ? 's' : ''} on {adjective}{sfReached === 1 ? ', including one run to the semifinal' : ''} — regularly reaching that stage is a solid baseline, with the next step being to break through to the final rounds more often.
          </p>
        )}

        {/* Top 10: only if 3+ matches, 3 graduated cases + follow-up sentence */}
        {top10Total >= 3 && (
          <p>
            vs. Top 10 on {adjective}: <strong className="text-green-400">{top10Wins}</strong>–<strong className="text-red-400">{top10Losses}</strong>{' '}
            (<strong className="text-blue-400">{top10WinPctN.toFixed(1)}%</strong>, <strong className="text-yellow-400">{top10Total}</strong> match{top10Total !== 1 ? 'es' : ''}).{' '}
            {top10WinPctN >= 55
              ? `Winning above .500 against the world's best on ${adjective} is a benchmark of genuine elite quality on this surface.`
              : top10WinPctN >= 40
              ? `Competitive against the elite, but still narrowly below .500 — closing that gap would directly elevate the overall ${adjective} court profile.`
              : `Top 10 opponents have represented a clear ceiling on ${adjective}; addressing that deficit is the single biggest lever for improving the overall record here.`
            }
          </p>
        )}

        {/* Bo5 vs Bo3: only when both 3+ matches, 5-tier gap analysis + insight */}
        {bo5Total >= 3 && bo3Total >= 3 && (
          <p>
            By format on {adjective} — best-of-five: <strong className="text-green-400">{bo5Wins}</strong>–<strong className="text-red-400">{bo5Losses}</strong>{' '}
            (<strong className="text-blue-400">{bo5WinPctN.toFixed(1)}%</strong>); best-of-three: <strong className="text-green-400">{bo3Wins}</strong>–<strong className="text-red-400">{bo3Losses}</strong>{' '}
            (<strong className="text-blue-400">{bo3WinPctN.toFixed(1)}%</strong>).{' '}
            {bo5WinPctN > bo3WinPctN + 8
              ? `Significantly better in five-set matches — a strong physical profile on ${adjective} that tends to tell as matches and tournaments progress.`
              : bo3WinPctN > bo5WinPctN + 8
              ? `Markedly stronger in three-set formats; the win rate drops noticeably in five-setters, which has direct implications for Grand Slam performance on ${adjective}.`
              : bo5WinPctN > bo3WinPctN + 2
              ? `Slightly better in five-set matches on ${adjective} — a positive sign for the Slams specifically.`
              : bo3WinPctN > bo5WinPctN + 2
              ? `Slightly stronger in three-set contests on ${adjective}, though the five-set record is still respectable.`
              : `Consistent regardless of format on ${adjective} — a sign of a well-rounded game that holds up as matches develop.`
            }
          </p>
        )}

        {/* Best season: only if 5+ matches, 3 graduated labels + context sentence */}
        {bestYear && bestYearTotal >= 5 && (
          <p>
            {bestYearWins >= 30 ? 'Dominant season' : bestYearWins >= 15 ? 'Peak season' : 'Best season'}: <strong className="text-yellow-400">{bestYear}</strong> —{' '}
            <strong className="text-green-400">{bestYearWins}</strong>–<strong className="text-red-400">{bestYearTotal - bestYearWins}</strong>{' '}
            (<strong className="text-blue-400">{((bestYearWins / bestYearTotal) * 100).toFixed(1)}%</strong>) from <strong className="text-yellow-400">{bestYearTotal}</strong> matches.{' '}
            {bestYearWins >= 30
              ? <>A campaign of <strong className="text-yellow-400">{bestYearWins}</strong> wins on {adjective} in a single season is among the best single-season records the surface has seen — the clearest benchmark of what is achievable at peak level.</>
              : bestYearWins >= 15
              ? `That year captures the ceiling of what ${displayName} can do on ${adjective} when performing at their best and represents the standard to aim for.`
              : `The best single-season display to date — a useful reference point as the ${adjective} record continues to develop.`
            }
          </p>
        )}

        {/* Win streak: threshold scales with career volume, 4 tiered labels + sentence */}
        {winStreak >= streakThreshold && (
          <p>
            {winStreak >= 30
              ? <>Historic: <strong className="text-yellow-400">{winStreak}</strong> consecutive wins on {adjective} — one of the longest winning streaks on this surface in the Open Era. To sustain that level across so many matches demands physical and mental consistency that very few players in history have matched.</>
              : winStreak >= 15
              ? <>{displayName} assembled a remarkable <strong className="text-yellow-400">{winStreak}</strong>-match winning streak on {adjective} — a run of that length goes far beyond form and into a different level of dominance on this surface.</>
              : winStreak >= 8
              ? <>{displayName} put together an impressive <strong className="text-yellow-400">{winStreak}</strong>-match winning streak on {adjective}, highlighting the ability to maintain high performance across multiple tournament rounds and events.</>
              : <>{displayName} recorded a notable <strong className="text-yellow-400">{winStreak}</strong>-match winning streak on {adjective} — a run that demonstrates consistency across consecutive draws on this surface.</>
            }
          </p>
        )}

        {/* Recent form: W/L + form sequence + hot/cold commentary */}
        {recentYearTotal > 0 && (
          <p>
            <strong className="text-yellow-400">Recent Form {currentYear}:</strong>{' '}
            <strong className="text-green-400">{recentYearRec.w}</strong>–<strong className="text-red-400">{recentYearRec.l}</strong>{' '}
            (<strong className="text-blue-400">{((recentYearRec.w / recentYearTotal) * 100).toFixed(1)}%</strong>) on {adjective}.
            {recentFormStr.length > 0 && (
              <>
                {' '}Last {recentFormStr.length}:{' '}
                {recentFormStr.map((r, i) => (
                  <span key={i} className={r === 'W' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{r}{' '}</span>
                ))}
                {recentFormStr.length >= 4 && (
                  recentW >= recentFormStr.length * 0.75 ? ' — excellent form, carrying real momentum.' :
                  recentW > recentFormStr.length / 2 ? ' — positive form, wins outweighing losses in the latest stretch.' :
                  recentW >= recentFormStr.length * 0.25 ? ' — mixed results, some inconsistency in the current period.' :
                  ' — a difficult recent run, with results not going the right way on this surface.'
                )}
              </>
            )}
          </p>
        )}

      </div>

    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-bold mb-6 text-center">{heading}</h1>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": displayName,
        "url": `https://stats.tennismylife.org/players/${slug}`,
        "mainEntityOfPage": canonical,
        "description": `${displayName} ${adjective} court record: ${wins}–${losses} (${winPct}), ${totalTitles} title${totalTitles !== 1 ? 's' : ''}. Full ATP ${adjective} stats on TennisMyLife.`,
        "knowsAbout": [
          `${label} tennis`,
          `${adjective} court tennis`,
          `${displayName} ${adjective} court results`,
          `${displayName} ATP stats`
        ],
        "subjectOf": {
          "@type": "WebPage",
          "name": heading,
          "url": canonical
        },
        "additionalProperty": [
          { "@type": "PropertyValue", "name": "matchesPlayed",      "value": totalMatches },
          { "@type": "PropertyValue", "name": "wins",               "value": wins },
          { "@type": "PropertyValue", "name": "losses",             "value": losses },
          { "@type": "PropertyValue", "name": "winPercentage",      "value": winPct },
          { "@type": "PropertyValue", "name": `${adjective}Titles`, "value": totalTitles }
        ]
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Players",       "item": "https://stats.tennismylife.org/players" },
          { "@type": "ListItem", "position": 2, "name": displayName,     "item": `https://stats.tennismylife.org/players/${slug}` },
          { "@type": "ListItem", "position": 3, "name": `${label} Statistics`, "item": canonical },
        ],
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `What are ${displayName}'s ${adjective} court stats?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName} has played ${totalMatches} matches on ${adjective}, winning ${wins} and losing ${losses} for a career win percentage of ${winPct}.` },
          },
          {
            "@type": "Question",
            "name": `How many ${adjective} court titles has ${displayName} won?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName} has won ${totalTitles} ATP title${totalTitles !== 1 ? 's' : ''} on ${adjective} courts${titles.length > 0 ? ': ' + titles.join(', ') : '.'}` },
          },
          {
            "@type": "Question",
            "name": `What is ${displayName}'s win percentage on ${adjective}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName}'s career win percentage on ${adjective} courts is ${winPct} (${wins} wins out of ${totalMatches} matches).` },
          },
          {
            "@type": "Question",
            "name": `Does this page include Grand Slam matches on ${adjective}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Yes. ${displayName}'s ${adjective} court stats include all Grand Slam matches played on ${adjective}, such as Roland Garros (clay), the Australian Open and US Open (hard), or Wimbledon (grass).` },
          },
          {
            "@type": "Question",
            "name": `How is win percentage on ${adjective} calculated?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Win percentage is calculated as (Total Wins ÷ Total Matches Played) × 100. It measures how successful ${displayName} has been specifically on ${adjective} courts throughout their career.` },
          },
          {
            "@type": "Question",
            "name": `Are Davis Cup matches included in ${displayName}'s ${adjective} court stats?`,
            "acceptedAnswer": { "@type": "Answer", "text": `No. This page focuses on official ATP Tour and Grand Slam matches on ${adjective} courts, excluding Davis Cup and other team events.` },
          },
        ],
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": `${displayName} ${label} Match Statistics`,
        "alternateName": `${displayName} ${adjective} court data`,
        "description": `Complete statistical dataset for ${displayName} on ${adjective} courts. Includes career win-loss record (${wins}–${losses}, ${winPct}), ${totalTitles} title${totalTitles !== 1 ? 's' : ''}, Grand Slam record (${slamWins}–${slamLosses}), Masters 1000 record (${mastersWins}–${mastersLosses}), vs Top 10 (${top10Wins}–${top10Losses}), best-of-five (${bo5Wins}–${bo5Losses}), best-of-three (${bo3Wins}–${bo3Losses}), ${winStreak > 0 ? `longest win streak ${winStreak}, ` : ''}year-by-year breakdown and full match history. ATP Tour and Grand Slam matches only.`,
        "url": canonical,
        "identifier": canonical,
        "inLanguage": "en-US",
        "dateModified": new Date().toISOString(),
        "keywords": [
          displayName,
          `${displayName} ${adjective}`,
          `${displayName} ${adjective} stats`,
          `${adjective} court`,
          "ATP tennis",
          "match results",
          "win loss record",
          "tennis statistics",
          "TennisMyLife",
          ...(surface === 'Clay' ? ["Roland Garros", "clay court tennis"] :
              surface === 'Hard' ? ["Australian Open", "US Open", "hard court tennis"] :
              ["Wimbledon", "grass court tennis"]),
        ],
        "creator": { "@type": "Organization", "name": "TennisMyLife", "url": "https://stats.tennismylife.org" },
        "publisher": { "@type": "Organization", "name": "TennisMyLife", "url": "https://stats.tennismylife.org" },
        "about": { "@type": "Person", "name": displayName, "url": `https://stats.tennismylife.org/players/${slug}` },
        "license": "https://creativecommons.org/licenses/by-nc/4.0/",
        "isAccessibleForFree": true,
        "variableMeasured": [
          { "@type": "PropertyValue", "name": "matchesPlayed",            "value": totalMatches },
          { "@type": "PropertyValue", "name": "wins",                     "value": wins },
          { "@type": "PropertyValue", "name": "losses",                   "value": losses },
          { "@type": "PropertyValue", "name": "winPercentage",            "value": winPct },
          { "@type": "PropertyValue", "name": `${adjective}Titles`,       "value": totalTitles },
          { "@type": "PropertyValue", "name": "finalsReached",            "value": finalsReached },
          { "@type": "PropertyValue", "name": "semifinalsReached",        "value": sfReached },
          { "@type": "PropertyValue", "name": "quarterfinalsReached",     "value": qfReached },
          { "@type": "PropertyValue", "name": "grandSlamWins",            "value": slamWins },
          { "@type": "PropertyValue", "name": "grandSlamLosses",         "value": slamLosses },
          { "@type": "PropertyValue", "name": "grandSlamMatches",         "value": slamTotal },
          { "@type": "PropertyValue", "name": "masters1000Wins",          "value": mastersWins },
          { "@type": "PropertyValue", "name": "masters1000Losses",        "value": mastersLosses },
          { "@type": "PropertyValue", "name": "masters1000Matches",       "value": mastersTotal },
          { "@type": "PropertyValue", "name": "vsTop10Wins",              "value": top10Wins },
          { "@type": "PropertyValue", "name": "vsTop10Losses",            "value": top10Losses },
          { "@type": "PropertyValue", "name": "bestOf5Wins",              "value": bo5Wins },
          { "@type": "PropertyValue", "name": "bestOf5Losses",            "value": bo5Losses },
          { "@type": "PropertyValue", "name": "bestOf3Wins",              "value": bo3Wins },
          { "@type": "PropertyValue", "name": "bestOf3Losses",            "value": bo3Losses },
          ...(winStreak > 0 ? [{ "@type": "PropertyValue", "name": "longestWinStreak", "value": winStreak }] : []),
          ...(bestYear ? [
            { "@type": "PropertyValue", "name": "bestSeason",             "value": bestYear },
            { "@type": "PropertyValue", "name": "bestSeasonWins",         "value": bestYearWins },
            { "@type": "PropertyValue", "name": "bestSeasonMatches",      "value": bestYearTotal },
          ] : []),
          ...(recentYearTotal > 0 ? [
            { "@type": "PropertyValue", "name": `${currentYear}Wins`,    "value": recentYearRec.w },
            { "@type": "PropertyValue", "name": `${currentYear}Losses`,  "value": recentYearRec.l },
          ] : []),
        ],
        "distribution": [
          {
            "@type": "DataDownload",
            "name": `${displayName} ${adjective} match history`,
            "encodingFormat": "text/html",
            "contentUrl": canonical,
          },
          {
            "@type": "DataDownload",
            "name": "TennisMyLife match database",
            "encodingFormat": "text/csv",
            "contentUrl": "https://stats.tennismylife.org/tennis-match-database",
          },
        ],
        "spatialCoverage": "Global",
        "temporalCoverage": "1968/..",
        "measurementTechnique": "ATP official match records",
      }) }} />

      {/* Delegate to the full player page shell.
          Pass tab='matches' + surface filter so PlayerTabPage SSR-fetches filtered
          matches and renders AllMatchesServer in the initial HTML for Google.
          _surfaceTab overrides the tab used for SEO URLs (SEOPlayer, SEOBreadcrumb)
          so they point to /clay|hard|grass instead of /matches. */}
      <PlayerTabPage
        params={Promise.resolve({ id, tab: 'matches' })}
        searchParams={Promise.resolve({ surface: surface })}
        _surfacePreviewNode={surfacePreviewNode}
        _surfaceTab={surfPath}
      />
    </>
  );
}
