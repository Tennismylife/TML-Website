"use client";

import { getFlagFromIOC } from "@/lib/utils";
import Link from "next/link";

interface Player {
  atpname: string;
  ioc: string;     // Aggiunto
  id?: string;     // Opzionale, per il Link
}

interface Match {
  winner_name: string;
  loser_name: string;
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
  const lastMatches = [...matches].slice(-5).reverse();

  // Calcolo colori dinamici (identico al tuo)
  const getColor = (a: number, b: number) => {
    if (a > b) return "!text-green-400";
    if (a < b) return "!text-red-400";
    return "text-gray-300";
  };

  const color1 = getColor(wins1, wins2);
  const color2 = getColor(wins2, wins1);
  const percColor1 = getColor(perc1, perc2);
  const percColor2 = getColor(perc2, perc1);

  return (
    <div className="mb-4 p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg shadow">

      {/* NUOVO: Nomi + bandierine in alto */}
      <div className="flex justify-between items-center mb-6 -mt-2">
        {/* Player 1 - sinistra */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getFlagFromIOC(player1.ioc)}</span>
          <span className="text-xl font-bold text-gray-100">
            {player1.atpname}
          </span>
        </div>

        {/* Player 2 - destra */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-100 text-right">
            {player2.atpname}
          </span>
          <span className="text-4xl">{getFlagFromIOC(player2.ioc)}</span>
        </div>
      </div>

      {/* Tutto il resto è IDENTICO al tuo codice originale */}
      <div className="text-center">
        {/* SCORE SUMMARY */}
        <div className="text-6xl font-bold mb-2">
          <span className={color1}>{wins1}</span>{" "}
          <span className="text-gray-400">-</span>{" "}
          <span className={color2}>{wins2}</span>
        </div>

        <div className="text-xl font-semibold mb-4">
          <span className={percColor1}>Wins: {perc1.toFixed(1)}%</span>{" "}
          <span className="text-gray-400"> - </span>
          <span className={percColor2}>{perc2.toFixed(1)}%</span>
        </div>

        {/* LAST 5 MATCHES */}
        <div className="flex justify-between mt-4">
          {/* Player 1 */}
          <div className="flex gap-2 justify-start">
            {lastMatches.map((m, i) => {
              const isWin = m.winner_name === player1.atpname;
              const isLoss = m.loser_name === player1.atpname;
              return (
                <span
                  key={i}
                  className={`font-bold text-2xl ${
                    isWin
                      ? "!text-green-400"
                      : isLoss
                      ? "!text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {isWin ? "W" : isLoss ? "L" : "-"}
                </span>
              );
            })}
          </div>

          {/* Player 2 */}
          <div className="flex gap-2 justify-end">
            {lastMatches.map((m, i) => {
              const isWin = m.winner_name === player2.atpname;
              const isLoss = m.loser_name === player2.atpname;
              return (
                <span
                  key={i}
                  className={`font-bold text-2xl ${
                    isWin
                      ? "!text-green-400"
                      : isLoss
                      ? "!text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {isWin ? "W" : isLoss ? "L" : "-"}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}