"use client";

import React from "react";

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

// Definizione del tipo coerente con tutti i campi di prisma.match
interface Match {
  id: number;
  tourney_id: string;
  tourney_name: string;
  surface: string;
  draw_size: number | null;
  tourney_level: string;
  tourney_date: Date;
  match_num: number | null;
  winner_id: string;
  winner_name: string;
  winner_ioc: string | null;
  loser_id: string;
  loser_name: string;
  loser_ioc: string | null;
  score: string;
  best_of: number | null;
  round: string;
  minutes: number | null;
  status: boolean;
}

interface H2HBarsProps {
  matches: Match[];
  player1: Player;
  player2: Player;
  category: "wins" | "sets" | "games";
}

const H2HBars: React.FC<H2HBarsProps> = ({ matches, player1, player2, category }) => {
  // --- Parser per punteggio ---
  const parseScore = (score: string) => {
    const sets = score.split(" ");
    let setsWinner = 0;
    let setsLoser = 0;
    let gamesWinner = 0;
    let gamesLoser = 0;

    sets.forEach((set) => {
      const parts = set.split("-");
      if (parts.length === 2) {
        const s1 = parseInt(parts[0], 10);
        const s2 = parseInt(parts[1], 10);
        if (!isNaN(s1) && !isNaN(s2)) {
          gamesWinner += s1;
          gamesLoser += s2;
          if (s1 > s2) setsWinner++;
          else setsLoser++;
        }
      }
    });

    return { setsWinner, setsLoser, gamesWinner, gamesLoser };
  };

  const labels = ["All", "Grand Slam", "Masters 1000", "Hard", "Grass", "Clay", "Carpet"];

  const values: Record<string, { val1: number; val2: number }> = {};

  labels.forEach((label) => {
    let val1 = 0;
    let val2 = 0;

    matches.forEach((m) => {
      const isPlayer1Winner = m.winner_name === player1.atpname;
      const isPlayer2Winner = m.winner_name === player2.atpname;
      const { setsWinner, setsLoser, gamesWinner, gamesLoser } = parseScore(m.score);

      let v1 = 0;
      let v2 = 0;
      const matchInCategory =
        label === "All" ||
        (label === "Grand Slam" && m.tourney_level === "G") ||
        (label === "Masters 1000" && m.tourney_level === "M") ||
        (label === "Hard" && m.surface === "Hard") ||
        (label === "Grass" && m.surface === "Grass") ||
        (label === "Clay" && m.surface === "Clay") ||
        (label === "Carpet" && m.surface === "Carpet");

      if (!matchInCategory) return;

      if (category === "wins") {
        v1 = isPlayer1Winner ? 1 : 0;
        v2 = isPlayer2Winner ? 1 : 0;
      } else if (category === "sets") {
        v1 = isPlayer1Winner ? setsWinner : setsLoser;
        v2 = isPlayer2Winner ? setsWinner : setsLoser;
      } else if (category === "games") {
        v1 = isPlayer1Winner ? gamesWinner : gamesLoser;
        v2 = isPlayer2Winner ? gamesWinner : gamesLoser;
      }

      val1 += v1;
      val2 += v2;
    });

    values[label] = { val1, val2 };
  });

  const maxGlobal = Math.max(...Object.values(values).flatMap((v) => [v.val1, v.val2]), 1);

  const renderBarRow = (label: string, val1: number, val2: number) => {
    const color1 = val1 >= val2 ? "bg-blue-600" : "bg-blue-300";
    const color2 = val2 >= val1 ? "bg-red-600" : "bg-red-300";

    return (
      <div className="flex items-center" key={label}>
        <div className="flex-1 flex justify-end items-center gap-2">
          <span>{val1}</span>
          <div
            className={`${color1} h-6 rounded-r transition-all duration-300`}
            style={{ width: `${(val1 / maxGlobal) * 100}%` }}
          />
        </div>
        <div className="px-4 font-semibold text-center w-32">{label}</div>
        <div className="flex-1 flex items-center gap-2">
          <div
            className={`${color2} h-6 rounded-l transition-all duration-300`}
            style={{ width: `${(val2 / maxGlobal) * 100}%` }}
          />
          <span>{val2}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {labels.map((label) => renderBarRow(label, values[label].val1, values[label].val2))}
    </div>
  );
};

export default H2HBars;
