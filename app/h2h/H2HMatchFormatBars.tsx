"use client";

import React from "react";

interface Player {
  id: string;
  atpname: string | null;
  ioc?: string | null;
}

interface Match {
  id: number;
  tourney_id: string | null;
  tourney_name: string | null;
  surface: string | null;
  draw_size: number | null;
  tourney_level: string | null;
  tourney_date: Date | null;
  match_num: number | null;
  winner_id: string | null;
  winner_name: string | null;
  winner_ioc: string | null;
  loser_id: string | null;
  loser_name: string | null;
  loser_ioc: string | null;
  score: string | null;
  best_of: number | null;
  round: string | null;
  minutes: number | null;
  status: boolean | null;
}

interface H2HMatchFormatBarsProps {
  matches: Match[];
  player1: Player;
  player2: Player;
}

const H2HMatchFormatBars: React.FC<H2HMatchFormatBarsProps> = ({ matches, player1, player2 }) => {
  const parseScore = (score: string) => {
    const sets = score.split(" ");
    let setsWinner = 0;
    let setsLoser = 0;
    sets.forEach((set) => {
      const parts = set.split("-");
      if (parts.length === 2) {
        const s1 = parseInt(parts[0], 10);
        const s2 = parseInt(parts[1], 10);
        if (!isNaN(s1) && !isNaN(s2)) {
          if (s1 > s2) setsWinner++;
          else setsLoser++;
        }
      }
    });
    return setsWinner + setsLoser;
  };

  const labels = ["Bo3", "Bo5", "2 Sets", "3 Sets", "4 Sets", "5 Sets"];

  const values: Record<string, { val1: number; val2: number }> = {};

  labels.forEach((label) => {
    let val1 = 0;
    let val2 = 0;

    matches.forEach((m) => {
      const isP1Winner = m.winner_name === player1.atpname;
      const isP2Winner = m.winner_name === player2.atpname;
      const totalSets = parseScore(m.score ?? "");

      const matchInCategory =
        (label === "Bo3" && m.best_of === 3) ||
        (label === "Bo5" && m.best_of === 5) ||
        (label === "2 Sets" && totalSets === 2) ||
        (label === "3 Sets" && totalSets === 3) ||
        (label === "4 Sets" && totalSets === 4) ||
        (label === "5 Sets" && totalSets === 5);

      if (!matchInCategory) return;

      if (isP1Winner) val1++;
      else if (isP2Winner) val2++;
    });

    values[label] = { val1, val2 };
  });

  const maxGlobal = Math.max(...Object.values(values).flatMap((v) => [v.val1, v.val2]), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-3 min-w-0 px-2" style={{ height: 240 }}>
        {labels.map((label) => {
          const { val1, val2 } = values[label];
          const h1 = Math.round((val1 / maxGlobal) * 170);
          const h2 = Math.round((val2 / maxGlobal) * 170);
          const color1 = val1 >= val2 ? "#2563eb" : "#93c5fd";
          const color2 = val2 >= val1 ? "#dc2626" : "#fca5a5";
          const total = val1 + val2;
          const pct1 = total > 0 ? ((val1 / total) * 100).toFixed(1) : "0.0";
          const pct2 = total > 0 ? ((val2 / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={label} className="flex flex-col items-center flex-1 min-w-0 gap-1">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 200 }}>
                <div className="flex flex-col items-center gap-0.5" style={{ flex: 1, maxWidth: 28 }}>
                  <span className="text-[10px]" style={{ color: color1, lineHeight: 1, opacity: 0.75 }}>{pct1}%</span>
                  <span className="text-xs font-semibold" style={{ color: color1, lineHeight: 1 }}>{val1}</span>
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{ height: h1, background: color1 }}
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5" style={{ flex: 1, maxWidth: 28 }}>
                  <span className="text-[10px]" style={{ color: color2, lineHeight: 1, opacity: 0.75 }}>{pct2}%</span>
                  <span className="text-xs font-semibold" style={{ color: color2, lineHeight: 1 }}>{val2}</span>
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{ height: h2, background: color2 }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
          <span className="text-xs text-blue-400 font-semibold">{player1.atpname}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-600" />
          <span className="text-xs text-red-400 font-semibold">{player2.atpname}</span>
        </div>
      </div>
    </div>
  );
};

export default H2HMatchFormatBars;
