"use client";

import React, { useMemo } from "react";
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';

interface Player {
  id?: string | number;
  atpname?: string | null;
  ioc?: string | null;
  slug?: string | null;
}

interface Match {
  winner_id?: string | number | null;
  loser_id?: string | number | null;
  surface?: string | null;
  tourney_level?: string | null;
  status?: boolean | null;
  score?: string | null;
  tourney_date?: string | number | null;
}

interface Props {
  player1: Player | null;
  player2: Player | null;
  matches: Match[];
}

export default function H2HPreviewClient({ player1, player2, matches }: Props) {
  const countedMatches = matches.filter(m => m.status !== false && !((m.score ?? '').toUpperCase().includes('DEF') || (m.score ?? '').toUpperCase().includes('W/O') || (m.score ?? '').toUpperCase().includes('WEA')));
  const total = countedMatches.length;

  const { wins1, wins2, pct1, pct2, slamMatches, slamScore, scores, p1_hard_wins, p1_hard_losses, p1_clay_wins, p1_clay_losses, p1_grass_wins, p1_grass_losses, p1_carpet_wins, p1_carpet_losses, p2_hard_wins, p2_hard_losses, p2_clay_wins, p2_clay_losses, p2_grass_wins, p2_grass_losses, p2_carpet_wins, p2_carpet_losses } = useMemo(() => {
    const wins1 = countedMatches.filter((m) => String(m.winner_id) === String(player1?.id)).length;
    const wins2 = countedMatches.filter((m) => String(m.winner_id) === String(player2?.id)).length;
    const pct1 = total > 0 ? ((wins1 / total) * 100).toFixed(1) : '0.0';
    const pct2 = total > 0 ? ((wins2 / total) * 100).toFixed(1) : '0.0';

    const surfaceNames = ['Hard', 'Clay', 'Grass', 'Carpet'];
    const scores: Record<string, string> = {};
    surfaceNames.forEach((s) => {
      const key = s.toLowerCase();
      const p1 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player1?.id)).length;
      const p2 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player2?.id)).length;
      scores[s] = `${p1}–${p2}`;
    });

    // Per-player counts per surface (wins and losses within the H2H)
    const p1_hard_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player1?.id)).length;
    const p1_hard_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player2?.id)).length;
    const p1_clay_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player1?.id)).length;
    const p1_clay_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player2?.id)).length;
    const p1_grass_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player1?.id)).length;
    const p1_grass_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player2?.id)).length;
    const p1_carpet_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes('carpet') && String(m.winner_id) === String(player1?.id)).length;
    const p1_carpet_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes('carpet') && String(m.winner_id) === String(player2?.id)).length;

    const p2_hard_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player2?.id)).length;
    const p2_hard_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player1?.id)).length;
    const p2_clay_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player2?.id)).length;
    const p2_clay_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player1?.id)).length;
    const p2_grass_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player2?.id)).length;
    const p2_grass_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player1?.id)).length;
    const p2_carpet_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes('carpet') && String(m.winner_id) === String(player2?.id)).length;
    const p2_carpet_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes('carpet') && String(m.winner_id) === String(player1?.id)).length;

    const slamMatches = countedMatches.filter((m) => m.tourney_level === 'G').length;
    const p1s = countedMatches.filter((m) => m.tourney_level === 'G' && String(m.winner_id) === String(player1?.id)).length;
    const p2s = countedMatches.filter((m) => m.tourney_level === 'G' && String(m.winner_id) === String(player2?.id)).length;
    const slamScore = `${p1s}–${p2s}`;

    return { wins1, wins2, pct1, pct2, slamMatches, slamScore, scores, p1_hard_wins, p1_hard_losses, p1_clay_wins, p1_clay_losses, p1_grass_wins, p1_grass_losses, p1_carpet_wins, p1_carpet_losses, p2_hard_wins, p2_hard_losses, p2_clay_wins, p2_clay_losses, p2_grass_wins, p2_grass_losses, p2_carpet_wins, p2_carpet_losses };
  }, [matches, player1?.id, player2?.id, total]);

  // Recent H2H matches (most recent first, up to 5)
  const recent = useMemo(() => {
    const getTime = (d: any) => {
      if (!d) return 0;
      if (typeof d === 'number') return d;
      const t = Date.parse(String(d));
      return Number.isNaN(t) ? 0 : t;
    };
    const sorted = [...countedMatches].sort((a, b) => getTime(b.tourney_date) - getTime(a.tourney_date));
    return sorted.slice(0, 5);
  }, [countedMatches]);

  const [p1Career, setP1Career] = React.useState<any | null>(null);
  const [p2Career, setP2Career] = React.useState<any | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchStats = async (id?: string | number) => {
      if (!id) return null;
      try {
        const res = await fetch(`/api/players/stats?id=${encodeURIComponent(String(id))}`);
        if (!res.ok) return null;
        const j = await res.json();
        return j;
      } catch {
        return null;
      }
    };

    (async () => {
      const [a,b] = await Promise.all([fetchStats(player1?.id), fetchStats(player2?.id)]);
      if (!mounted) return;
      setP1Career(a);
      setP2Career(b);
    })();

    return () => { mounted = false; };
  }, [player1?.id, player2?.id]);

  if (!player1 || !player2) return null;

  const leader = wins1 > wins2 ? player1.atpname : wins2 > wins1 ? player2.atpname : null;

  const valueClass = (a: number, b: number) => {
    if (a > b) return "font-bold text-green-400";
    if (a < b) return "font-bold text-red-400";
    return "font-semibold text-gray-300";
  };



  return (
    <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {player2.ioc ? <Flag ioc={player2.ioc} className="w-6 h-4 inline-block rounded-sm object-cover" /> : null}
          <Link href={getPlayerHref(player2.slug ?? String(player2.id))} className="text-2xl font-bold text-gray-100 hover:underline">{player2.atpname}</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href={getPlayerHref(player1.slug ?? String(player1.id))} className="text-2xl font-bold text-gray-100 text-right hover:underline">{player1.atpname}</Link>
          {player1.ioc ? <Flag ioc={player1.ioc} className="w-6 h-4 inline-block rounded-sm object-cover" /> : null}
        </div>
      </div>

      <div className="text-center">
        <div className="text-6xl md:text-7xl font-bold mb-2">
          <span className="!text-green-400">{wins2}</span>
          <span className="text-gray-400 mx-3">-</span>
          <span className="!text-red-400">{wins1}</span>
        </div>

        <div className="text-lg md:text-2xl font-semibold mb-4">
          <span className="!text-green-400">Wins: {pct2}%</span>
          <span className="text-gray-400 mx-2"> - </span>
          <span className="!text-red-400">{pct1}%</span>
        </div>

        <div className="flex justify-between mt-4">
          <div className="flex gap-2 justify-start">
            {recent.map((m, idx) => (
              <span key={`p2-${idx}`} className={`font-bold text-2xl ${String(m.winner_id) === String(player2.id) ? 'text-green-400' : 'text-red-400'}`}>
                {String(m.winner_id) === String(player2.id) ? 'W' : 'L'}
              </span>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            {recent.map((m, idx) => (
              <span key={`p1-${idx}`} className={`font-bold text-2xl ${String(m.winner_id) === String(player1.id) ? 'text-green-400' : 'text-red-400'}`}>
                {String(m.winner_id) === String(player1.id) ? 'W' : 'L'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
