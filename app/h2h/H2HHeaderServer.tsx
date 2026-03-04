import Flag from '@/components/Flag';
import Link from "next/link";
import { getPlayerHrefWithTab } from "@/lib/utils";
import { lastNMatches, playerResultsForMatches } from '@/lib/h2hUtils';
import H2HHypotheticalMatchup from './H2HHypotheticalMatchup';

interface Player {
  atpname: string | null;
  ioc?: string | null;
  id?: string;
  birthdate?: Date | string | null;
  hand?: string | null;
  backhand?: string | null;
}

interface Match {
  winner_name: string | null;
  loser_name: string | null;
  winner_id?: string | null;
  loser_id?: string | null;
  // additional fields used by header calculations
  surface?: string | null;
  tourney_level?: string | null;
}

interface H2HHeaderServerProps {
  wins1: number;
  wins2: number;
  perc1?: number;
  perc2?: number;
  player1: Player;
  player2: Player;
  matches: Match[];
  rank1?: number | null;
  rank2?: number | null;
  points1?: number | null;
  points2?: number | null;
}

export default function H2HHeaderServer({
  wins1,
  wins2,
  perc1 = 0,
  perc2 = 0,
  player1,
  player2,
  matches,
  rank1,
  rank2,
  points1,
  points2,
}: H2HHeaderServerProps) {
  // Take last 5 matches in chronological order (oldest → newest)
  const lastMatches = [...matches].slice(-5);

  const computeAge = (birthdate: Date | string | null | undefined) => {
    if (!birthdate) return null;
    const bd = birthdate instanceof Date ? birthdate : new Date(birthdate);
    if (isNaN(bd.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - bd.getFullYear();
    const mDiff = today.getMonth() - bd.getMonth();
    const dDiff = today.getDate() - bd.getDate();
    if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) years--;
    const lastBirthday = new Date(
      today.getFullYear() - (mDiff < 0 || (mDiff === 0 && dDiff < 0) ? 1 : 0),
      bd.getMonth(),
      bd.getDate()
    );
    const days = Math.floor((today.getTime() - lastBirthday.getTime()) / 86400000);
    const birthdateStr = bd.toISOString().split('T')[0];
    return { years, days, birthdateStr };
  };

  const p1Age = computeAge(player1.birthdate);
  const p2Age = computeAge(player2.birthdate);

  const getColor = (a: number, b: number) => {
    if (a > b) return "!text-green-400";
    if (a < b) return "!text-red-400";
    return "text-gray-300";
  };

  // helpers for head-to-head surface/level scores
  const surfaceScore = (surfaceName: string) => {
    const key = surfaceName.toLowerCase();
    const p1 = matches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player1.id)).length;
    const p2 = matches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player2.id)).length;
    return `${p1}–${p2}`;
  };
  const levelScore = (lvl: string) => {
    const p1 = matches.filter((m) => (m.tourney_level ?? '') === lvl && String(m.winner_id) === String(player1.id)).length;
    const p2 = matches.filter((m) => (m.tourney_level ?? '') === lvl && String(m.winner_id) === String(player2.id)).length;
    return `${p1}–${p2}`;
  };
  // compute distinct levels present in matches
  const levelValues = Array.from(new Set(matches.map(m => (m.tourney_level || '').trim()).filter(l => l !== '')));

  const color1 = getColor(wins1, wins2);
  const color2 = getColor(wins2, wins1);
  const percColor1 = getColor(perc1, perc2);
  const percColor2 = getColor(perc2, perc1);

  return (
    <div className="mb-4 p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg shadow">
      {/* Nomi + bandierine in alto */}
      <div className="flex justify-between items-center mb-6 -mt-2">
        {/* Player 1 - sinistra */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <Flag ioc={player1.ioc ?? undefined} className="w-6 h-4 inline-block" />
            <Link href={getPlayerHrefWithTab((player1 as any).slug ?? String(player1.id ?? ''), 'matches')} className="text-2xl font-bold text-gray-100 hover:underline">
              {player1.atpname ?? ''}
            </Link>
          </div>
          <div className="text-xs text-gray-400 mt-1 ml-9 space-y-0.5">
            {rank1 != null && (
              <div className="relative inline-flex flex-col mt-1 mb-2">
                {/* glow ring */}
                <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-br from-yellow-400 via-yellow-600 to-transparent opacity-60" />
                <div className="relative flex items-center gap-3 bg-gray-900/90 rounded-lg px-3 py-2 shadow-lg shadow-yellow-900/20">
                  {/* ATP pill */}
                  <div className="flex flex-col items-center justify-center bg-yellow-500/15 border border-yellow-500/30 rounded px-1.5 py-0.5 min-w-[32px]">
                    <span className="text-[9px] font-black text-yellow-400 tracking-[0.2em] uppercase leading-none">ATP</span>
                  </div>
                  {/* rank + label */}
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-yellow-300 leading-none tracking-tight">#{rank1}</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-tight mt-0.5">Ranking</span>
                  </div>
                  {/* points */}
                  {points1 != null && (
                    <div className="ml-1 flex flex-col items-end border-l border-gray-700 pl-2.5">
                      <span className="text-xs font-semibold text-gray-300 leading-none">{points1.toLocaleString()}</span>
                      <span className="text-[9px] text-gray-600 uppercase tracking-wide leading-tight mt-0.5">pts</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {p1Age && <div>Age: <span data-h2h-color="yellow">{p1Age.years}y {p1Age.days}d</span> <span>({p1Age.birthdateStr})</span></div>}
            {player1.hand && <div>Hand: <span data-h2h-color="yellow">{player1.hand}</span></div>}
            {player1.backhand && <div>Backhand: <span data-h2h-color="yellow">{player1.backhand}</span></div>}
          </div>
        </div>

        {/* Player 2 - destra */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
            <Link href={getPlayerHrefWithTab((player2 as any).slug ?? String(player2.id ?? ''), 'matches')} className="text-2xl font-bold text-gray-100 text-right hover:underline">
              {player2.atpname ?? ''}
            </Link>
            <Flag ioc={player2.ioc ?? undefined} className="w-6 h-4 inline-block" />
          </div>
          <div className="text-xs text-gray-400 mt-1 mr-9 space-y-0.5 text-right">
            {rank2 != null && (
              <div className="relative inline-flex flex-col mt-1 mb-2">
                {/* glow ring */}
                <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-bl from-yellow-400 via-yellow-600 to-transparent opacity-60" />
                <div className="relative flex items-center gap-3 bg-gray-900/90 rounded-lg px-3 py-2 shadow-lg shadow-yellow-900/20">
                  {/* points */}
                  {points2 != null && (
                    <div className="mr-1 flex flex-col items-start border-r border-gray-700 pr-2.5">
                      <span className="text-xs font-semibold text-gray-300 leading-none">{points2.toLocaleString()}</span>
                      <span className="text-[9px] text-gray-600 uppercase tracking-wide leading-tight mt-0.5">pts</span>
                    </div>
                  )}
                  {/* rank + label */}
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-yellow-300 leading-none tracking-tight">#{rank2}</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-tight mt-0.5">Ranking</span>
                  </div>
                  {/* ATP pill */}
                  <div className="flex flex-col items-center justify-center bg-yellow-500/15 border border-yellow-500/30 rounded px-1.5 py-0.5 min-w-[32px]">
                    <span className="text-[9px] font-black text-yellow-400 tracking-[0.2em] uppercase leading-none">ATP</span>
                  </div>
                </div>
              </div>
            )}
            {p2Age && <div><span>({p2Age.birthdateStr})</span> Age: <span data-h2h-color="yellow">{p2Age.years}y {p2Age.days}d</span></div>}
            {player2.hand && <div>Hand: <span data-h2h-color="yellow">{player2.hand}</span></div>}
            {player2.backhand && <div>Backhand: <span data-h2h-color="yellow">{player2.backhand}</span></div>}
          </div>
        </div>
      </div>

      <div className="text-center">
        {/* SCORE SUMMARY */}
        <div className="text-7xl font-bold mb-2">
          <span className={color1}>{wins1}</span>{" "}
          <span className="text-gray-400">-</span>{" "}
          <span className={color2}>{wins2}</span>
        </div>

        <div className="text-2xl font-semibold mb-4">
          <span className={percColor1}>Wins: {perc1.toFixed(1)}%</span>{" "}
          <span className="text-gray-400"> - </span>
          <span className={percColor2}>{perc2.toFixed(1)}%</span>
        </div>
        {/* compact pill-style breakdown */}
        <div className="flex flex-wrap justify-center gap-2 text-xs mb-1">
          {['hard','clay','grass'].map(surf => {
            const score = surfaceScore(surf);
            const [p1,p2] = score.split('–').map(Number);
            const colorClass = getColor(p1,p2);
            const label = surf.charAt(0).toUpperCase() + surf.slice(1);
            return (
              <span key={surf} className="px-2 py-0.5 bg-gray-700 rounded">
                {label} <span className={colorClass}>{score}</span>
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs mb-4">
          {levelValues.map(lvl => {
            let label: string;
            if (lvl === 'G') label = 'Slam';
            else if (lvl === 'F') label = 'Finals';
            else if (lvl === 'M') label = 'Masters 1000';
            else if (lvl === 'O') label = 'Olympics';
            else if (lvl === 'D') label = 'Davis Cup';
            else if (lvl === 'A') label = 'Others';
            else label = lvl;
            const [p1,p2] = levelScore(lvl).split('–').map(Number);
            const colorClass = getColor(p1,p2);
            return (
              <span key={lvl} className="px-2 py-0.5 bg-gray-700 rounded">
                {label} <span className={colorClass}>{p1}–{p2}</span>
              </span>
            );
          })}
        </div>

        {/* LAST 5 MATCHES: per-player rows (oldest → newest on each row) */}
        <div className="flex justify-between mt-4">
          {/* Player 1: left */}
          <div className="flex gap-2 justify-start">
            {(() => {
              const last = lastNMatches(matches, 5);
              const p1 = playerResultsForMatches(player1.id, player1.atpname, last);
              return p1.map((r, i) => (
                <span key={i} className={`font-bold text-2xl ${r === 'W' ? "!text-green-400" : r === 'L' ? "!text-red-400" : "text-gray-500"}`}>
                  {r}
                </span>
              ));
            })()}
          </div>

          {/* Player 2: right */}
          <div className="flex gap-2 justify-end">
            {(() => {
              const last = lastNMatches(matches, 5);
              const p2 = playerResultsForMatches(player2.id, player2.atpname, last);
              return p2.map((r, i) => (
                <span key={i} className={`font-bold text-2xl ${r === 'W' ? "!text-green-400" : r === 'L' ? "!text-red-400" : "text-gray-500"}`}>
                  {r}
                </span>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Hypothetical Match-Up Prediction */}
      <div className="mt-5 border-t border-gray-600/50 pt-4">
        <H2HHypotheticalMatchup
          player1={player1 as any}
          player2={player2 as any}
          rank1={rank1}
          rank2={rank2}
          points1={points1}
          points2={points2}
          h2hWins1={wins1}
          h2hWins2={wins2}
        />
      </div>
    </div>
  );
}
