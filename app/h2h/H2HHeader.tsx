"use client";

import Flag from '@/components/Flag';
import Link from "next/link";
import { getPlayerHref } from '@/lib/utils';
import { lastNMatches, playerResultsForMatches } from '@/lib/h2hUtils';

interface Player {
  atpname: string | null;
  ioc: string | null;     // Aggiunto
  id?: string;     // Opzionale, per il Link
}

interface Match {
  winner_name: string | null;
  loser_name: string | null;
  winner_id?: string | null;
  loser_id?: string | null;
}

interface H2HHeaderProps {
  wins1: number;
  wins2: number;
  perc1?: number;
  perc2?: number;
  player1: Player;
  player2: Player;
  matches: Match[];
}

export default function H2HHeader({
  wins1,
  wins2,
  perc1 = 0,
  perc2 = 0,
  player1,
  player2,
  matches,
}: H2HHeaderProps) {
  // Take last 5 matches in chronological order (oldest → newest)
  // Calcolo colori dinamici (identico al tuo)
  const getColor = (a: number, b: number) => {
    if (a > b) return "!text-green-400";
    if (a < b) return "!text-red-400";
    return "text-gray-300";
  };

  // Usa funzioni centralizzate per ultime partite e sequenze W/L
  // (filtraggio COUNTED, ordinamento, fallback id→name)
  // Import a livello file: see lib/h2hUtils.ts

  const color1 = getColor(wins1, wins2);
  const color2 = getColor(wins2, wins1);
  const percColor1 = getColor(perc1, perc2);
  const percColor2 = getColor(perc2, perc1);

  return (
    <div className="mb-4 p-4 md:p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg shadow">

      {/* NUOVO: Nomi + bandierine in alto */}
      <div className="flex justify-between items-center mb-6 -mt-2 gap-2">
        {/* Player 1 - sinistra */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Flag ioc={player1.ioc ?? undefined} className="w-6 h-4 inline-block shrink-0" />
          <Link href={getPlayerHref((player1 as any).slug ?? String(player1.id ?? ''))} className="text-base md:text-xl font-bold text-gray-100 hover:underline min-w-0 truncate">
            {player1.atpname ?? ''}
          </Link>
        </div>

        {/* Player 2 - destra */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <Link href={getPlayerHref((player2 as any).slug ?? String(player2.id ?? ''))} className="text-base md:text-xl font-bold text-gray-100 text-right hover:underline min-w-0 truncate">
            {player2.atpname ?? ''}
          </Link>
          <Flag ioc={player2.ioc ?? undefined} className="w-6 h-4 inline-block shrink-0" />
        </div>
      </div>

      {/* Tutto il resto è IDENTICO al tuo codice originale */}
      <div className="text-center">
        {/* SCORE SUMMARY */}
        <div className="text-4xl md:text-6xl font-bold mb-2">
          <span className={color1}>{wins1}</span>{" "}
          <span className="text-gray-400">-</span>{" "}
          <span className={color2}>{wins2}</span>
        </div>

        <div className="text-base md:text-xl font-semibold mb-4">
          <span className={percColor1}>Wins: {perc1.toFixed(1)}%</span>{" "}
          <span className="text-gray-400"> - </span>
          <span className={percColor2}>{perc2.toFixed(1)}%</span>
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
    </div>
  );
}