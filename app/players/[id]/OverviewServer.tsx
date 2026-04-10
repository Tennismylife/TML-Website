// Server Component — Career Overview + Last 10 Matches rendered server-side so Google indexes them.
import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getTourneyHref, getPlayerHref, formatDateISO, getRoundIndex, createSlug } from '@/lib/utils';
import { mapIdsToSlugs } from '@/lib/player-slugs';
import Flag from '@/components/Flag';

interface OverviewServerProps {
  playerId: string;
  playerName: string;
  playerSlug?: string | null;
}

// ─── computation ────────────────────────────────────────────────────────────

function computeStats(matches: any[], playerId: string, playerName: string) {
  const pid = String(playerId);
  const active = matches.filter((m: any) => m.status === true);
  if (!active.length) return null;

  const totalMatches = active.length;
  const wins = active.filter((m: any) => String(m.winner_id) === pid).length;
  const losses = totalMatches - wins;
  const winRateN = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const winPct = `${winRateN.toFixed(1)}%`;

  const slamMatches = active.filter((m: any) => m.tourney_level === 'G');
  const slamWins = slamMatches.filter((m: any) => String(m.winner_id) === pid).length;
  const slamLosses = slamMatches.length - slamWins;
  const slamTotal = slamMatches.length;
  const slamWinPctN = slamTotal > 0 ? (slamWins / slamTotal) * 100 : 0;

  const mastersMatches = active.filter((m: any) => m.tourney_level === 'M');
  const mastersWins = mastersMatches.filter((m: any) => String(m.winner_id) === pid).length;
  const mastersLosses = mastersMatches.length - mastersWins;
  const mastersTotal = mastersMatches.length;
  const mastersWinPctN = mastersTotal > 0 ? (mastersWins / mastersTotal) * 100 : 0;

  const finalMatches = active.filter((m: any) => m.round === 'F');
  const finalsReached = finalMatches.length;
  const isValidTitle = (m: any) =>
    String(m.winner_id) === pid &&
    m.team_event !== true &&
    !(m.score && String(m.score).includes('WEA')) &&
    !String(m.tourney_name ?? '').toLowerCase().includes('next gen');

  const totalTitles = finalMatches.filter(isValidTitle).length;
  const titleNames = Array.from(new Set(
    finalMatches
      .filter((m: any) => String(m.winner_id) === pid && m.team_event !== true)
      .map((m: any) => (typeof m.tourney_name === 'string' ? m.tourney_name : null))
      .filter(Boolean) as string[],
  ));

  const sfReached = active.filter(
    (m: any) => m.round === 'SF' && (String(m.winner_id) === pid || String(m.loser_id) === pid),
  ).length;
  const qfReached = active.filter(
    (m: any) => m.round === 'QF' && (String(m.winner_id) === pid || String(m.loser_id) === pid),
  ).length;

  const top10Total = active.filter((m: any) => {
    const iAmWinner = String(m.winner_id) === pid;
    const oppRank = iAmWinner ? m.loser_rank : m.winner_rank;
    return oppRank != null && oppRank <= 10;
  }).length;
  const top10Wins = active.filter((m: any) => {
    const iAmWinner = String(m.winner_id) === pid;
    const oppRank = iAmWinner ? m.loser_rank : m.winner_rank;
    return iAmWinner && oppRank != null && oppRank <= 10;
  }).length;
  const top10Losses = top10Total - top10Wins;
  const top10WinPctN = top10Total > 0 ? (top10Wins / top10Total) * 100 : 0;

  const bo5Matches = active.filter((m: any) => m.best_of === 5);
  const bo5Wins = bo5Matches.filter((m: any) => String(m.winner_id) === pid).length;
  const bo5Losses = bo5Matches.length - bo5Wins;
  const bo5Total = bo5Matches.length;
  const bo5WinPctN = bo5Total > 0 ? (bo5Wins / bo5Total) * 100 : 0;

  const bo3Matches = active.filter((m: any) => m.best_of === 3);
  const bo3Wins = bo3Matches.filter((m: any) => String(m.winner_id) === pid).length;
  const bo3Losses = bo3Matches.length - bo3Wins;
  const bo3Total = bo3Matches.length;
  const bo3WinPctN = bo3Total > 0 ? (bo3Wins / bo3Total) * 100 : 0;

  const yearMap = new Map<number, { wins: number; total: number }>();
  for (const m of active) {
    const y = m.year ?? 0;
    if (!y) continue;
    const cur = yearMap.get(y) ?? { wins: 0, total: 0 };
    cur.total++;
    if (String(m.winner_id) === pid) cur.wins++;
    yearMap.set(y, cur);
  }
  let bestYear = '', bestYearWins = 0, bestYearTotal = 0;
  for (const [y, s] of yearMap.entries()) {
    if (s.total >= 5 && s.wins > bestYearWins) {
      bestYearWins = s.wins; bestYearTotal = s.total; bestYear = String(y);
    }
  }

  const chronological = [...active].sort((a: any, b: any) => {
    const da = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
    const db = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
    return da - db;
  });
  let winStreak = 0, curStreak = 0;
  for (const m of chronological) {
    if (String(m.winner_id) === pid) { curStreak++; if (curStreak > winStreak) winStreak = curStreak; }
    else curStreak = 0;
  }

  const currentYear = new Date().getFullYear();
  const recentYearMatches = chronological.filter((m: any) => m.year === currentYear);
  const recentW = recentYearMatches.filter((m: any) => String(m.winner_id) === pid).length;
  const recentL = recentYearMatches.length - recentW;
  const recentYearTotal = recentYearMatches.length;
  const recentFormStr: string[] = recentYearMatches
    .slice(-10)
    .map((m: any) => (String(m.winner_id) === pid ? 'W' : 'L'));
  const recentFormW = recentFormStr.filter((r) => r === 'W').length;

  const streakThreshold = totalMatches >= 200 ? 20 : totalMatches >= 100 ? 12 : totalMatches >= 50 ? 8 : 5;
  const titleConvRate = finalsReached > 0 ? totalTitles / finalsReached : 0;

  const titlesByLevel: Record<string, number> = {};
  const titlesBySurface: Record<string, number> = {};
  finalMatches.filter(isValidTitle).forEach((m: any) => {
    const lvl = m.tourney_level ?? 'Other';
    titlesByLevel[lvl] = (titlesByLevel[lvl] || 0) + 1;
    const surf = m.surface ?? 'Unknown';
    titlesBySurface[surf] = (titlesBySurface[surf] || 0) + 1;
  });

  return {
    totalMatches, wins, losses, winRateN, winPct,
    slamWins, slamLosses, slamTotal, slamWinPctN,
    mastersWins, mastersLosses, mastersTotal, mastersWinPctN,
    finalsReached, totalTitles, titleNames, titlesByLevel, titlesBySurface,
    sfReached, qfReached,
    top10Wins, top10Losses, top10Total, top10WinPctN,
    bo5Wins, bo5Losses, bo5Total, bo5WinPctN,
    bo3Wins, bo3Losses, bo3Total, bo3WinPctN,
    bestYear, bestYearWins, bestYearTotal,
    winStreak, streakThreshold,
    currentYear, recentW, recentL, recentYearTotal, recentFormStr, recentFormW,
    titleConvRate,
    displayName: playerName || String(playerId),
  };
}

// ─── main component ──────────────────────────────────────────────────────────

export default async function OverviewServer({ playerId, playerName, playerSlug }: OverviewServerProps) {
  // ── 1. fetch matches ─────────────────────────────────────────────────────
  const rawMatches = await prisma.match.findMany({
    where: { OR: [{ winner_id: playerId }, { loser_id: playerId }], status: true },
    select: {
      winner_id: true, loser_id: true, status: true,
      surface: true, round: true,
      tourney_name: true, tourney_level: true, tourney_id: true, tourney_date: true,
      score: true, team_event: true, best_of: true,
      winner_rank: true, loser_rank: true,
      winner_name: true, winner_ioc: true,
      loser_name: true, loser_ioc: true,
      year: true,
    },
  });

  // ── 2. enrich with slugs (same as allmatches API) ───────────────────────
  const playerIds = Array.from(new Set(
    rawMatches.flatMap((m) => [m.winner_id, m.loser_id]).filter((id): id is string => !!id),
  ));
  const slugMap = await mapIdsToSlugs(playerIds);

  const tourneyIdParts = Array.from(new Set(
    rawMatches.map((m) => {
      const s = String(m.tourney_id || '');
      const parts = s.split('-').filter(Boolean);
      return parts.length === 2 ? parts[1] : s;
    }).filter(Boolean),
  ));
  let tourneySlugMap: Record<string, string | null> = {};
  if (tourneyIdParts.length > 0) {
    try {
      const tours = await prisma.tournament.findMany({
        where: { id: { in: tourneyIdParts.map((v) => Number(v)).filter((n) => !Number.isNaN(n)) } },
        select: { id: true, slug: true, name: true },
      });
      tourneySlugMap = tours.reduce((acc: Record<string, string | null>, t: any) => {
        acc[String(t.id)] = t.slug ?? createSlug(t.name ?? String(t.id));
        return acc;
      }, {});
    } catch {
      // best-effort
    }
  }

  const allMatches = rawMatches.map((m) => ({
    ...m,
    winner_slug: m.winner_id ? (slugMap[String(m.winner_id)] ?? null) : null,
    loser_slug: m.loser_id ? (slugMap[String(m.loser_id)] ?? null) : null,
    tourney_slug: (() => {
      const s = String(m.tourney_id || '');
      const parts = s.split('-').filter(Boolean);
      const idPart = parts.length === 2 ? parts[1] : s;
      return idPart ? (tourneySlugMap[idPart] ?? null) : null;
    })(),
  }));

  // ── 3. compute stats ─────────────────────────────────────────────────────
  const s = computeStats(allMatches, playerId, playerName);
  if (!s) return null;

  // ── 4. last 10 matches ───────────────────────────────────────────────────
  const last10 = [...allMatches]
    .sort((a, b) => {
      const da = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
      const db = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
      if (db !== da) return db - da;
      return getRoundIndex(b.round, b.tourney_level) - getRoundIndex(a.round, a.tourney_level);
    })
    .slice(0, 10);

  // ── 5. render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Career Overview ── */}
      <div className="mb-6 p-5 bg-gray-800 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#facc15' }}>Career Overview</h3>
        <div className="text-sm leading-relaxed text-gray-200 space-y-3">

          {/* Overall career record */}
          {s.totalMatches < 5 ? (
            <p>
              <strong>{s.displayName}</strong> has played only{' '}
              <strong className="text-yellow-400">{s.totalMatches}</strong> match{s.totalMatches !== 1 ? 'es' : ''} — too small a sample to draw firm conclusions about their career record.
            </p>
          ) : (
            <p>
              <strong>{s.displayName}</strong>{' '}
              {s.winRateN >= 75 ? 'has had a dominant career, posting' :
               s.winRateN >= 65 ? 'has an impressive career record of' :
               s.winRateN >= 55 ? 'holds a solid career record of' :
               s.winRateN >= 45 ? 'has a competitive career record of' :
               'has found the Tour difficult, recording'}{' '}
              <strong className="text-green-400">{s.wins}</strong>–<strong className="text-red-400">{s.losses}</strong>{' '}
              across <strong className="text-yellow-400">{s.totalMatches}</strong> matches (<strong className="text-blue-400">{s.winPct}</strong>
              {s.winRateN >= 75 ? ' — exceptional' : s.winRateN >= 65 ? ' — strong' : ''}).{' '}
              {s.winRateN >= 75
                ? 'Few players in the Open Era have sustained that level of dominance across a full career.'
                : s.winRateN >= 65
                ? `A win rate of that calibre over ${s.totalMatches} matches is a reliable indicator of genuine quality.`
                : s.winRateN >= 55
                ? `A winning majority across ${s.totalMatches} matches shows consistent ability to get results on Tour.`
                : s.winRateN >= 45
                ? 'The record shows a player capable of competing at Tour level, though there is clear room to push the win rate higher.'
                : 'The numbers point to a player still building their Tour presence — a key area of opportunity going forward.'
              }
              {' '}
              {s.totalTitles === 0 && s.finalsReached > 0
                ? <>{s.displayName} has reached <strong className="text-yellow-400">{s.finalsReached}</strong> final{s.finalsReached !== 1 ? 's' : ''} without yet claiming a title — one of the finest margins in tennis.</>
                : s.totalTitles >= 10
                ? <>With <strong className="text-yellow-400">{s.totalTitles}</strong> titles, among the most prolific champions in the Open Era{s.titleNames.length > 0 ? `: ${s.titleNames.slice(0, 4).join(', ')}${s.titleNames.length > 4 ? ` and ${s.titleNames.length - 4} more` : ''}` : ''}.</>
                : s.totalTitles >= 4
                ? <><strong className="text-yellow-400">{s.totalTitles}</strong> titles{s.titleNames.length > 0 ? `: ${s.titleNames.join(', ')}` : ''} — a record that reflects consistent ability to close out tournaments.</>
                : s.totalTitles > 0
                ? <>Claimed <strong className="text-yellow-400">{s.totalTitles}</strong> title{s.totalTitles !== 1 ? 's' : ''}{s.titleNames.length > 0 ? `: ${s.titleNames.join(', ')}` : ''}.</>
                : null
              }
            </p>
          )}

          {/* Grand Slams */}
          {s.slamTotal > 0 && (
            <p>
              At Grand Slam level (Australian Open, Roland Garros, Wimbledon, US Open):{' '}
              {s.slamWins === 0
                ? <>{s.displayName} has yet to record a win at Grand Slam level — <strong className="text-green-400">0</strong>–<strong className="text-red-400">{s.slamTotal}</strong> across <strong className="text-yellow-400">{s.slamTotal}</strong> match{s.slamTotal !== 1 ? 'es' : ''}. Breaking through here would mark a significant step forward.</>
                : s.slamTotal <= 3
                ? <><strong className="text-green-400">{s.slamWins}</strong>–<strong className="text-red-400">{s.slamLosses}</strong> across just <strong className="text-yellow-400">{s.slamTotal}</strong> match{s.slamTotal !== 1 ? 'es' : ''} — still very early days at this level.</>
                : s.slamWinPctN >= 72
                ? <>{s.displayName} has been outstanding at the Slams — <strong className="text-green-400">{s.slamWins}</strong>–<strong className="text-red-400">{s.slamLosses}</strong> (<strong className="text-blue-400">{s.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.slamTotal}</strong> matches. Winning more than 7 in 10 Grand Slam matches is the benchmark of an all-time great.</>
                : s.slamWinPctN >= 58
                ? <>a positive <strong className="text-green-400">{s.slamWins}</strong>–<strong className="text-red-400">{s.slamLosses}</strong> (<strong className="text-blue-400">{s.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.slamTotal}</strong> matches — a player who generally rises to the occasion at the Slams.</>
                : s.slamWinPctN >= 40
                ? <>{s.displayName} is <strong className="text-green-400">{s.slamWins}</strong>–<strong className="text-red-400">{s.slamLosses}</strong> (<strong className="text-blue-400">{s.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.slamTotal}</strong> Grand Slam matches — below .500, though the elite draw depth makes that a notoriously difficult barrier.</>
                : <>{s.displayName} has struggled at Grand Slam level: <strong className="text-green-400">{s.slamWins}</strong>–<strong className="text-red-400">{s.slamLosses}</strong> (<strong className="text-blue-400">{s.slamWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{s.slamTotal}</strong> matches. The best-of-five format and elite fields make this the toughest benchmark on Tour.</>
              }
            </p>
          )}

          {/* Masters 1000 */}
          {s.mastersTotal >= 3 && (
            <p>
              ATP Masters 1000 (Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris):{' '}
              {s.mastersWinPctN >= 65
                ? <>{s.displayName} is elite here — <strong className="text-green-400">{s.mastersWins}</strong>–<strong className="text-red-400">{s.mastersLosses}</strong> (<strong className="text-blue-400">{s.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.mastersTotal}</strong> matches. Sustaining that win rate in the Tour's deepest regular-week draws is a defining quality of the very best.</>
                : s.mastersWinPctN >= 50
                ? <>a positive <strong className="text-green-400">{s.mastersWins}</strong>–<strong className="text-red-400">{s.mastersLosses}</strong> (<strong className="text-blue-400">{s.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.mastersTotal}</strong> matches — winning above .500 at this level, week in week out, is a genuine sign of quality.</>
                : s.mastersWinPctN >= 35
                ? <>{s.displayName} is <strong className="text-green-400">{s.mastersWins}</strong>–<strong className="text-red-400">{s.mastersLosses}</strong> (<strong className="text-blue-400">{s.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{s.mastersTotal}</strong> Masters matches — below .500 in the Tour's deepest fields. Lifting that record here would unlock better results across the calendar.</>
                : <>{s.displayName} has struggled at Masters level: <strong className="text-green-400">{s.mastersWins}</strong>–<strong className="text-red-400">{s.mastersLosses}</strong> (<strong className="text-blue-400">{s.mastersWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{s.mastersTotal}</strong> matches. Improving at this level is the clearest path to a stronger overall record.</>
              }
            </p>
          )}

          {/* Finals */}
          {s.finalsReached >= 2 && (
            <p>
              <strong className="text-yellow-400">{s.finalsReached}</strong> finals reached —{' '}
              {s.titleConvRate >= 0.75
                ? <>converted <strong className="text-yellow-400">{s.totalTitles}</strong> into titles (outstanding <strong className="text-blue-400">{(s.titleConvRate * 100).toFixed(0)}%</strong> conversion rate). Converting finals at that rate separates champions from contenders.</>
                : s.titleConvRate >= 0.5
                ? <>won <strong className="text-yellow-400">{s.totalTitles}</strong>, lost <strong className="text-yellow-400">{s.finalsReached - s.totalTitles}</strong> (solid <strong className="text-blue-400">{(s.titleConvRate * 100).toFixed(0)}%</strong> conversion) — consistently getting to finals and winning the majority is a hallmark of elite performers.</>
                : s.totalTitles === 0
                ? <>none converted into a title yet. Reaching <strong className="text-yellow-400">{s.finalsReached}</strong> final{s.finalsReached !== 1 ? 's' : ''} is a mark of real quality, but the gap between finalist and champion is one of the finest lines in the sport.</>
                : <>won <strong className="text-yellow-400">{s.totalTitles}</strong>, lost <strong className="text-yellow-400">{s.finalsReached - s.totalTitles}</strong> (<strong className="text-blue-400">{(s.titleConvRate * 100).toFixed(0)}%</strong> conversion) — capable of reaching finals consistently, with room to improve at the decisive moment.</>
              }
              {s.sfReached > 0 && <>{' '}<strong className="text-yellow-400">{s.sfReached}</strong> semifinal{s.sfReached !== 1 ? 's' : ''}.</>}
              {s.qfReached > 0 && <>{' '}<strong className="text-yellow-400">{s.qfReached}</strong> quarterfinal{s.qfReached !== 1 ? 's' : ''}.</>}
            </p>
          )}
          {s.finalsReached === 1 && (
            <p>
              One final reached{s.totalTitles === 1
                ? ', converted into a title — a perfect finals record so far.'
                : ', without converting it into a title. That final-round experience is valuable groundwork for going one step further next time.'
              }
              {s.sfReached > 0 && <>{' '}<strong className="text-yellow-400">{s.sfReached}</strong> semifinal{s.sfReached !== 1 ? 's' : ''}.</>}
              {s.qfReached > 0 && <>{' '}<strong className="text-yellow-400">{s.qfReached}</strong> quarterfinal{s.qfReached !== 1 ? 's' : ''}.</>}
            </p>
          )}

          {/* Top 10 */}
          {s.top10Total >= 3 && (
            <p>
              vs. Top 10: <strong className="text-green-400">{s.top10Wins}</strong>–<strong className="text-red-400">{s.top10Losses}</strong>{' '}
              (<strong className="text-blue-400">{s.top10WinPctN.toFixed(1)}%</strong>, <strong className="text-yellow-400">{s.top10Total}</strong> match{s.top10Total !== 1 ? 'es' : ''}).{' '}
              {s.top10WinPctN >= 55
                ? "Winning above .500 against the world's best is a benchmark of genuine elite quality on Tour."
                : s.top10WinPctN >= 40
                ? 'Competitive against the elite, but still narrowly below .500 — closing that gap would directly elevate the overall career profile.'
                : 'Top 10 opponents have represented a clear ceiling; addressing that deficit is the single biggest lever for improving the overall record.'
              }
            </p>
          )}

          {/* Bo5 vs Bo3 */}
          {s.bo5Total >= 3 && s.bo3Total >= 3 && (
            <p>
              By format — best-of-five: <strong className="text-green-400">{s.bo5Wins}</strong>–<strong className="text-red-400">{s.bo5Losses}</strong>{' '}
              (<strong className="text-blue-400">{s.bo5WinPctN.toFixed(1)}%</strong>); best-of-three: <strong className="text-green-400">{s.bo3Wins}</strong>–<strong className="text-red-400">{s.bo3Losses}</strong>{' '}
              (<strong className="text-blue-400">{s.bo3WinPctN.toFixed(1)}%</strong>).{' '}
              {s.bo5WinPctN > s.bo3WinPctN + 8
                ? 'Significantly better in five-set matches — a strong physical profile that tends to tell as matches and tournaments progress.'
                : s.bo3WinPctN > s.bo5WinPctN + 8
                ? 'Markedly stronger in three-set formats; the win rate drops noticeably in five-setters, which has direct implications for Grand Slam performance.'
                : s.bo5WinPctN > s.bo3WinPctN + 2
                ? 'Slightly better in five-set matches — a positive sign for Grand Slam campaigns specifically.'
                : s.bo3WinPctN > s.bo5WinPctN + 2
                ? 'Slightly stronger in three-set contests, though the five-set record is still respectable.'
                : 'Consistent regardless of format — a sign of a well-rounded game that holds up as matches develop.'
              }
            </p>
          )}

          {/* Best season */}
          {s.bestYear && s.bestYearTotal >= 5 && (
            <p>
              {s.bestYearWins >= 70 ? 'Historic season' : s.bestYearWins >= 40 ? 'Dominant season' : s.bestYearWins >= 20 ? 'Peak season' : 'Best season'}: <strong className="text-yellow-400">{s.bestYear}</strong> —{' '}
              <strong className="text-green-400">{s.bestYearWins}</strong>–<strong className="text-red-400">{s.bestYearTotal - s.bestYearWins}</strong>{' '}
              (<strong className="text-blue-400">{((s.bestYearWins / s.bestYearTotal) * 100).toFixed(1)}%</strong>) from <strong className="text-yellow-400">{s.bestYearTotal}</strong> matches.{' '}
              {s.bestYearWins >= 70
                ? <>{`A campaign of `}<strong className="text-yellow-400">{s.bestYearWins}</strong>{` wins in a single season is among the finest single-season records the Open Era has seen — the clearest benchmark of what is achievable at peak level.`}</>
                : s.bestYearWins >= 40
                ? `That year represents a level of dominance that sets the ceiling for what ${s.displayName} can produce.`
                : s.bestYearWins >= 20
                ? `That year captures the ceiling of what ${s.displayName} can do when performing at their best and represents the standard to aim for.`
                : 'The best single-season display to date — a useful reference point as the career continues to develop.'
              }
            </p>
          )}

          {/* Win streak */}
          {s.winStreak >= s.streakThreshold && (
            <p>
              {s.winStreak >= 30
                ? <><strong>{s.displayName}</strong> assembled a historic <strong className="text-yellow-400">{s.winStreak}</strong>-match winning streak — one of the longest in the Open Era. Sustaining that level across so many matches demands physical and mental consistency that very few players have matched.</>
                : s.winStreak >= 15
                ? <>{s.displayName} assembled a remarkable <strong className="text-yellow-400">{s.winStreak}</strong>-match winning streak — a run of that length goes far beyond form and into a different level of dominance.</>
                : s.winStreak >= 8
                ? <>{s.displayName} put together an impressive <strong className="text-yellow-400">{s.winStreak}</strong>-match winning streak, highlighting the ability to maintain high performance across multiple tournament rounds and events.</>
                : <>{s.displayName} recorded a notable <strong className="text-yellow-400">{s.winStreak}</strong>-match winning streak — a run that demonstrates consistency across consecutive draws.</>
              }
            </p>
          )}

          {/* Recent form */}
          {s.recentYearTotal > 0 && (
            <p>
              <strong className="text-yellow-400">Recent Form {s.currentYear}:</strong>{' '}
              <strong className="text-green-400">{s.recentW}</strong>–<strong className="text-red-400">{s.recentL}</strong>{' '}
              (<strong className="text-blue-400">{((s.recentW / s.recentYearTotal) * 100).toFixed(1)}%</strong>).
              {s.recentFormStr.length > 0 && (
                <>{' '}Last {s.recentFormStr.length}:{' '}
                  {s.recentFormStr.map((r, i) => (
                    <span key={i} className={r === 'W' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{r}{' '}</span>
                  ))}
                  {s.recentFormStr.length >= 4 && (
                    s.recentFormW >= s.recentFormStr.length * 0.75 ? ' — excellent form, carrying real momentum.' :
                    s.recentFormW > s.recentFormStr.length / 2 ? ' — positive form, wins outweighing losses in the latest stretch.' :
                    s.recentFormW >= s.recentFormStr.length * 0.25 ? ' — mixed results, some inconsistency in the current period.' :
                    ' — a difficult recent run, with results not going the right way.'
                  )}
                </>
              )}
            </p>
          )}

        </div>
      </div>

      {/* ── Last 10 Matches ── */}
      {last10.length > 0 && (
        <div className="mb-8 p-5 bg-gray-800 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{ color: '#facc15' }}>Last 10 Matches</h3>
            <Link
                href={
                  playerSlug
                    ? `${getPlayerHref(playerSlug)}/matches`
                    : `${getPlayerHref(playerId)}/matches`
                }
              className="inline-block bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold text-sm py-1.5 px-4 rounded-full transition-all duration-200"
            >
              View All Matches ↗
            </Link>
          </div>
          <div className="overflow-x-auto rounded border border-white/20 bg-gray-900 shadow">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black/80">
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Date</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Tournament</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Srf</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Rd</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Wrk</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Winner</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Lrk</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Loser</th>
                  <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {last10.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-800/50">
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {formatDateISO(m.tourney_date)}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {m.tourney_name ? (
                        m.tourney_id ? (
                          <Link
                            href={getTourneyHref({ slug: m.tourney_slug ?? undefined, id: m.tourney_id, year: m.year })}
                            className="text-indigo-300 hover:underline"
                          >
                            {m.tourney_name}
                          </Link>
                        ) : m.tourney_name
                      ) : '-'}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.surface ?? '-'}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.round ?? '-'}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {m.winner_rank != null && m.winner_slug
                        ? <Link href={`/players/${m.winner_slug}/ranking`} className="hover:underline">{m.winner_rank}</Link>
                        : m.winner_rank ?? '-'}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                        {m.winner_slug || m.winner_id ? (
                          <Link href={getPlayerHref(m.winner_slug ?? String(m.winner_id))} className="text-gray-200 hover:text-yellow-400">
                            {m.winner_name ?? ''}
                          </Link>
                        ) : (m.winner_name ?? '')}
                      </div>
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {m.loser_rank != null && m.loser_slug
                        ? <Link href={`/players/${m.loser_slug}/ranking`} className="hover:underline">{m.loser_rank}</Link>
                        : m.loser_rank ?? '-'}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
                        {m.loser_slug || m.loser_id ? (
                          <Link href={getPlayerHref(m.loser_slug ?? String(m.loser_id))} className="text-gray-400 hover:text-gray-200">
                            {m.loser_name ?? ''}
                          </Link>
                        ) : (m.loser_name ?? '')}
                      </div>
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center font-mono text-gray-200">{m.score ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
