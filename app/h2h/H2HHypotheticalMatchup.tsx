"use client";

import React, { useMemo } from "react";

interface Player {
  id?: string | number;
  atpname?: string | null;
  ioc?: string | null;
}

interface Props {
  player1: Player;
  player2: Player;
  rank1?: number | null;
  rank2?: number | null;
  points1?: number | null;
  points2?: number | null;
  h2hWins1?: number;
  h2hWins2?: number;
  careerWinPct1?: number | null; // 0‒100
  careerWinPct2?: number | null;
}

// ─── Utility ────────────────────────────────────────────────────────────────
function pct(value: number) {
  return value.toFixed(1);
}

function americanOdds(prob: number): string {
  if (prob <= 0 || prob >= 1) return "—";
  if (prob >= 0.5) {
    return `-${Math.round((prob / (1 - prob)) * 100)}`;
  } else {
    return `+${Math.round(((1 - prob) / prob) * 100)}`;
  }
}

/** Apply bookmaker margin (vig) asymmetrically: all vig goes onto the underdog. */
function applyVig(prob1: number, prob2: number, vig = 0.05): [number, number] {
  const [favP, dogP, swapped] = prob1 >= prob2
    ? [prob1, prob2, false]
    : [prob2, prob1, true];
  // Favorite stays near fair; underdog's implied probability is pushed up by vig
  const impliedFav = favP;
  const impliedDog = Math.min(dogP + vig, 0.99);
  return swapped ? [impliedDog, impliedFav] : [impliedFav, impliedDog];
}

/** Bar that fills left→right */
function ProbBar({ pct1, pct2, color1, color2 }: { pct1: number; pct2: number; color1: string; color2: string }) {
  const p1 = Math.max(0, Math.min(100, pct1));
  return (
    <div className="relative h-4 rounded-full overflow-hidden bg-gray-700 w-full">
      <div
        className="absolute left-0 top-0 h-full transition-all duration-700"
        style={{ width: `${p1}%`, background: color1 }}
      />
      <div
        className="absolute right-0 top-0 h-full transition-all duration-700"
        style={{ width: `${100 - p1}%`, background: color2 }}
      />
    </div>
  );
}

export default function H2HHypotheticalMatchup({
  player1,
  player2,
  rank1,
  rank2,
  points1,
  points2,
  h2hWins1 = 0,
  h2hWins2 = 0,
  careerWinPct1,
  careerWinPct2,
}: Props) {
  const prediction = useMemo(() => {
    // ── win_rate: prefer career pct, fallback to H2H, fallback to 0.5 ──────
    const h2hTotal = h2hWins1 + h2hWins2;
    const winRate1 = careerWinPct1 != null
      ? careerWinPct1 / 100
      : h2hTotal > 0 ? h2hWins1 / h2hTotal : 0.5;
    const winRate2 = careerWinPct2 != null
      ? careerWinPct2 / 100
      : h2hTotal > 0 ? h2hWins2 / h2hTotal : 0.5;

    // ── strength rating ──────────────────────────────────────────────────
    // rating = (points * 0.6) + (win_rate * 100 * 0.4)
    const pts1 = points1 ?? 0;
    const pts2 = points2 ?? 0;
    if (pts1 <= 0 && pts2 <= 0) return null;

    const ratingA = pts1 * 0.6 + winRate1 * 100 * 0.4;
    const ratingB = pts2 * 0.6 + winRate2 * 100 * 0.4;

    // ── Elo probability ──────────────────────────────────────────────────
    // Use a larger divisor scaled to ranking-point magnitudes.
    // Standard Elo 400 assumes ratings ~1000-3000; ATP points reach 10000+,
    // so we scale the divisor proportionally: 400 * (max_rating / 400) ≈ max_rating.
    const maxRating = Math.max(ratingA, ratingB, 1);
    const divisor = maxRating;
    const probA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / divisor));
    const probB = 1 - probA;

    return { prob1: probA * 100, prob2: probB * 100 };
  }, [points1, points2, h2hWins1, h2hWins2, careerWinPct1, careerWinPct2]);

  if (!prediction) return null;

  const { prob1, prob2 } = prediction;
  const fav = prob1 >= prob2 ? 1 : 2;

  // Apply vig asymmetrically for American odds display
  const [vigProb1, vigProb2] = applyVig(prob1 / 100, prob2 / 100);

  return (
    <div className="space-y-3">
      {/* Title */}
      <p className="text-sm font-semibold text-gray-300 uppercase tracking-widest text-center">Match Prediction</p>

      {/* Favorite / Underdog badges */}
      <div className="flex justify-between items-end px-1">
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${fav === 1 ? "bg-green-900/60 text-green-400" : "bg-gray-700 text-gray-500"}`}>
          {fav === 1 ? "Favorite" : "Underdog"}
        </span>
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${fav === 2 ? "bg-green-900/60 text-green-400" : "bg-gray-700 text-gray-500"}`}>
          {fav === 2 ? "Favorite" : "Underdog"}
        </span>
      </div>

      {/* Main probability bar */}
      <ProbBar
        pct1={prob1}
        pct2={prob2}
        color1={fav === 1 ? "#22c55e" : "#f87171"}
        color2={fav === 2 ? "#22c55e" : "#f87171"}
      />

      {/* Percentages */}
      <div className="flex justify-between px-1">
        <span className={`text-3xl font-black leading-none ${fav === 1 ? "text-green-400" : "text-red-400"}`}>{pct(prob1)}%</span>
        <span className={`text-3xl font-black leading-none ${fav === 2 ? "text-green-400" : "text-red-400"}`}>{pct(prob2)}%</span>
      </div>

      {/* American odds */}
      <div className="flex justify-between px-1">
        <span className={`text-base font-semibold font-mono ${fav === 1 ? "text-green-500" : "text-gray-500"}`}>{americanOdds(vigProb1)}</span>
        <span className={`text-base font-semibold font-mono ${fav === 2 ? "text-green-500" : "text-gray-500"}`}>{americanOdds(vigProb2)}</span>
      </div>
    </div>
  );
}
