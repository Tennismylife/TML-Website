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

interface H2HComebackBarsProps {
  matches: Match[];
  player1: Player;
  player2: Player;
}

// Returns per-set results from winner's perspective: 'W' = winner won that set, 'L' = winner lost it
// Score format: "6-4 3-6 7-5" where left number is always winner's games
function parseSetResults(score: string): ("W" | "L")[] {
  return score
    .trim()
    .split(" ")
    .map((s) => s.replace(/\(\d+\)/g, "")) // strip tiebreak notation e.g. 7-6(4)
    .filter((s) => s.includes("-"))
    .map((s) => {
      const [w, l] = s.split("-").map(Number);
      return !isNaN(w) && !isNaN(l) ? (w > l ? "W" : "L") : null;
    })
    .filter((r): r is "W" | "L" => r !== null);
}

function hadDeciderSet(score: string, best_of: number | null): boolean {
  const sets = parseSetResults(score);
  return sets.length === best_of;
}

function hadTiebreak(score: string): boolean {
  // A tiebreak set has notation like 7-6(n) or 6-7(n) or just 7-6 / 6-7
  return score.split(" ").some((s) => {
    const clean = s.replace(/\(\d+\)/g, "");
    const parts = clean.split("-").map(Number);
    if (parts.length !== 2) return false;
    return (parts[0] === 7 && parts[1] === 6) || (parts[0] === 6 && parts[1] === 7);
  });
}

const LABELS = [
  { key: "decider",   label: "Decider Set" },
  { key: "tiebreak",  label: "Tiebreak Wins" },
  { key: "after3h",   label: "After 3 hours" },
];

const H2HComebackBars: React.FC<H2HComebackBarsProps> = ({ matches, player1, player2 }) => {
  const values: Record<string, { val1: number; val2: number }> = {
    decider:  { val1: 0, val2: 0 },
    tiebreak: { val1: 0, val2: 0 },
    after3h:  { val1: 0, val2: 0 },
  };

  matches.forEach((m) => {
    const isP1Winner = m.winner_name === player1.atpname;
    const isP2Winner = m.winner_name === player2.atpname;
    if (!isP1Winner && !isP2Winner) return;

    const score = m.score ?? "";

    // Decider Set
    if (hadDeciderSet(score, m.best_of)) {
      if (isP1Winner) values.decider.val1++;
      else values.decider.val2++;
    }

    // Tiebreak Wins
    if (hadTiebreak(score)) {
      if (isP1Winner) values.tiebreak.val1++;
      else values.tiebreak.val2++;
    }

    // After 3 hours
    if (m.minutes != null && m.minutes > 180) {
      if (isP1Winner) values.after3h.val1++;
      else values.after3h.val2++;
    }
  });

  const maxGlobal = Math.max(...Object.values(values).flatMap((v) => [v.val1, v.val2]), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-3 min-w-0 px-2" style={{ height: 240 }}>
        {LABELS.map(({ key, label }) => {
          const { val1, val2 } = values[key];
          const h1 = Math.round((val1 / maxGlobal) * 170);
          const h2 = Math.round((val2 / maxGlobal) * 170);
          const color1 = val1 >= val2 ? "#2563eb" : "#93c5fd";
          const color2 = val2 >= val1 ? "#dc2626" : "#fca5a5";
          const total = val1 + val2;
          const pct1 = total > 0 ? ((val1 / total) * 100).toFixed(1) : "0.0";
          const pct2 = total > 0 ? ((val2 / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={key} className="flex flex-col items-center flex-1 min-w-0 gap-1">
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
              <span className="text-xs text-gray-400 text-center leading-tight" style={{ maxWidth: 80 }}>{label}</span>
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

export default H2HComebackBars;
