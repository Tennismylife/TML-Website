import { useMemo } from "react";
import type { Match } from "@/types";

interface PerformanceCalculationsProps {
  filtered: Match[];
  playerId: string;
}

function parseSets(score: string | undefined | null) {
  if (!score) return [] as { a: number; b: number; tb: boolean }[];
  const tokens = String(score).trim().split(/\s+/);
  const setRe = /^(\d+)-(\d+)(\(\d{1,2}\))?$/;
  return tokens
    .map((t) => {
      const m = t.match(setRe);
      return m ? { a: +m[1], b: +m[2], tb: !!m[3] } : null;
    })
    .filter(Boolean) as { a: number; b: number; tb: boolean }[];
}

function pct(n: number, d: number) {
  return d ? (n / d) * 100 : 0;
}

function wlFrom(matches: Match[], playerId: string) {
  let W = 0,
    L = 0;
  for (const m of matches) {
    const win = String(m.winner_id) === String(playerId);
    win ? W++ : L++;
  }
  return { W, L, winPct: pct(W, W + L) };
}

function getOpponentRank(m: Match, playerId: string): number | undefined {
  const iAmWinner = String(m.winner_id) === String(playerId);
  const r = iAmWinner ? m.loser_rank : m.winner_rank;
  return typeof r === "number" ? r : typeof r === "string" ? Number(r) : undefined;
}

export default function PerformanceCalculations({
  filtered,
  playerId,
}: PerformanceCalculationsProps) {
  // --- Performance / Surface / Pressure ---

  const perfRows = useMemo(() => {
    const defs = [
      { key: "overall", label: "Overall", filter: (m: Match) => true },
      { key: "gs", label: "Grand Slam", filter: (m: Match) => m.tourney_level === "G" },
      { key: "tf", label: "Tour Finals", filter: (m: Match) => m.tourney_level === "F" },
      { key: "masters", label: "Masters", filter: (m: Match) => m.tourney_level === "M" },
      { key: "olympics", label: "Olympics", filter: (m: Match) => m.tourney_level === "O" },
    ] as const;

    return defs.map((d) => {
      const list = filtered.filter(d.filter);
      return { ...d, ...wlFrom(list, playerId), matches: list.length };
    });
  }, [filtered, playerId]);

  const surfaceRows = useMemo(() => {
    const kinds = ["Hard", "Clay", "Grass", "Carpet"] as const;

    return kinds.map((k) => {
      const list = filtered.filter((m) => m.surface === k);
      return { key: k, label: `${k} Matches`, ...wlFrom(list, playerId), matches: list.length };
    });
  }, [filtered, playerId]);

  // --- Pressure Situations ---
  const pressureRows = useMemo(() => {
    const setsParser = (m: Match) => parseSets((m as any).score);

    // --- SETS ---
    const defsSets = [
      {
        key: "deciding",
        label: "Deciding Set",
        filter: (m: Match) => {
          const score = (m as any).score || "";
          const hasRet = /RET/i.test(score);
          const dashCount = (score.match(/-/g) || []).length;
          const bo = m.best_of;

          if (hasRet) {
            return dashCount === bo;
          } else {
            const s = setsParser(m);
            return (bo === 3 && s.length === 3) || (bo === 5 && s.length === 5);
          }
        },
      },
      {
        key: "fifth",
        label: "5th Set",
        filter: (m: Match) => setsParser(m).length >= 5,
      },
      {
        key: "win1st",
        label: "After Winning 1st Set",
        filter: (m: Match) => {
          const s = setsParser(m);
          if (!s[0]) return false;
          const i = String(m.winner_id) === String(playerId);
          return i ? s[0].a > s[0].b : s[0].b > s[0].a;
        },
      },
      {
        key: "lose1st",
        label: "After Losing 1st Set",
        filter: (m: Match) => {
          const s = setsParser(m);
          if (!s[0]) return false;
          const i = String(m.winner_id) === String(playerId);
          return i ? s[0].a < s[0].b : s[0].b < s[0].a;
        },
      },
      {
        key: "deciding_tb",
        label: "Deciding Set Tie-Breaks",
        filter: (m: Match) => {
          const s = setsParser(m);
          const bo = m.best_of;
          const decidingSet = bo === 5 ? 5 : 3;
          return s.length === decidingSet && s[s.length - 1].tb;
        },
      },
      {
        key: "tbs",
        label: "Tie-Breaks",
        filter: (m: Match) => setsParser(m).some((s) => s.tb),
      },
    ] as const;

    // --- RANKINGS (aggiunte tutte le categorie) ---
    const defsRankings = [
      { key: "vs1", label: "Vs No. 1", filter: (m: Match) => getOpponentRank(m, playerId) === 1 },
      { key: "vs5", label: "Vs Top 5", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r <= 5;
      }},
      { key: "vs10", label: "Vs Top 10", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r <= 10;
      }},
      { key: "vs20", label: "Vs Top 20", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r <= 20;
      }},
      { key: "vs50", label: "Vs Top 50", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r <= 50;
      }},
      { key: "vs100", label: "Vs Top 100", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r <= 100;
      }},
      { key: "vs100plus", label: "Vs 100+ Ranked", filter: (m: Match) => {
        const r = getOpponentRank(m, playerId);
        return r != null && r > 100;
      }},
      { key: "higher", label: "Vs Higher-Ranked", filter: (m: Match) => {
        const opp = getOpponentRank(m, playerId);
        const me = String(m.winner_id) === String(playerId) ? m.winner_rank : m.loser_rank;
        if (!opp || !me) return false;
        return opp < me;
      }},
      { key: "lower", label: "Vs Lower-Ranked", filter: (m: Match) => {
        const opp = getOpponentRank(m, playerId);
        const me = String(m.winner_id) === String(playerId) ? m.winner_rank : m.loser_rank;
        if (!opp || !me) return false;
        return opp > me;
      }},
    ] as const;

    const setsRows = defsSets.map((d) => {
      const list = filtered.filter(d.filter);
      return { ...d, ...wlFrom(list, playerId), matches: list.length };
    });

    const rankingsRows = defsRankings.map((d) => {
      const list = filtered.filter(d.filter);
      return { ...d, ...wlFrom(list, playerId), matches: list.length };
    });

    return { setsRows, rankingsRows };
  }, [filtered, playerId]);

  return { perfRows, surfaceRows, pressureRows };
}
