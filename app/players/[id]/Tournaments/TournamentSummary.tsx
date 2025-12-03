"use client";

import React, { useMemo, useState } from "react";

interface Match {
  tourney_id: string | null;
  tourney_name: string;
  year: number;
  surface?: string;
  tourney_level?: string;
  round?: string;
  status?: boolean;

  M?: number;
  W?: number;

  svpt?: number;
  aces?: number;
  df?: number;
  first_in?: number;
  first_won?: number;
  second_won?: number;

  BP?: number;
  BP_Saved?: number;
  BP_Conceded?: number;
}

interface TournamentSummaryProps {
  filteredMatches: Match[];
}

type SummaryRow = {
  Event: string;
  Years: string;
  Level: string;
  Surface: string;
  M: number;
  W: number;
  L: number;
  WinPerc: string;
  BP: number;
  BP_Saved: number;
  BP_Conceded: number;
  BPperc: string;
  Best: string;
  Aces: number;
  DF: number;
  FirstIn: string;
  FirstWon: string;
  SecondWon: string;
};

const ROUND_ORDER = [
  "W", "F", "SF", "QF", "R16", "R32", "R64", "R128",
  "Q3", "Q2", "Q1",
  "RR", "G",
  "BR",
  "R"
];

const LEVEL_LABELS: Record<string, string> = {
  "G": "Grand Slam",
  "M": "Masters 1000",
  "500": "ATP 500",
  "250": "ATP 250",
  "A": "Others",
  "O": "Olympics",
  "F": "Finals",
};

const SLAM_ORDER = [
  "Australian Open",
  "Roland Garros",
  "Wimbledon",
  "US Open"
];

function bestRoundOf(matches: Match[]): string {
  const wonFinal = matches.some(m => (m.round === "F" || m.round === "W") && m.W! > 0);
  if (wonFinal) return "W";

  const present = new Set(matches.map(m => m.round ?? "R"));
  for (const r of ROUND_ORDER) {
    if (present.has(r)) return r;
  }
  return "-";
}

function fmtPerc(val: number | null | undefined): string {
  if (!val || !Number.isFinite(val)) return "-";
  return `${val.toFixed(1)}%`;
}

function fmtNum(val: number | null | undefined): string {
  if (!val || !Number.isFinite(val)) return "-";
  return val.toLocaleString();
}

function formatYears(years: number[]): string {
  const sorted = Array.from(new Set(years)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(",");
}

export default function TournamentSummary({ filteredMatches }: TournamentSummaryProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof SummaryRow; direction: "asc" | "desc" } | null>(null);

  const summaryStats = useMemo<SummaryRow[]>(() => {
    if (!filteredMatches || !filteredMatches.length) return [];

    const grouped: Record<string, Match[]> = {};
    for (const m of filteredMatches) {
      if (!m.tourney_id) continue;
      if (!grouped[m.tourney_id]) grouped[m.tourney_id] = [];
      grouped[m.tourney_id].push(m);
    }

    const rows: SummaryRow[] = Object.values(grouped).map((tourneyMatches) => {
      const validMatches = tourneyMatches.filter(m => m.status !== false);

      const Years = formatYears(tourneyMatches.map(m => m.year));
      const Level = Array.from(new Set(tourneyMatches.map(m => LEVEL_LABELS[m.tourney_level ?? ""] || "Unknown")))
        .sort((a, b) => a.localeCompare(b)).join(", ");
      const Surface = Array.from(new Set(tourneyMatches.map(m => m.surface ?? "Unknown")))
        .sort((a, b) => a.localeCompare(b)).join(", ");

      const totals = validMatches.reduce((acc, m) => {
        acc.M += m.M ?? 0;
        acc.W += m.W ?? 0;
        acc.BP += m.BP ?? 0;
        acc.BP_Saved += m.BP_Saved ?? 0;
        acc.BP_Conceded += m.BP_Conceded ?? 0;
        acc.Aces += m.aces ?? 0;
        acc.DF += m.df ?? 0;
        acc.svpt += m.svpt ?? 0;
        acc.first_in += m.first_in ?? 0;
        acc.first_won += m.first_won ?? 0;
        acc.second_won += m.second_won ?? 0;
        return acc;
      }, { M:0, W:0, BP:0, BP_Saved:0, BP_Conceded:0, Aces:0, DF:0, svpt:0, first_in:0, first_won:0, second_won:0 });

      const L = Math.max(totals.M - totals.W, 0);
      const WinPerc = totals.M > 0 ? fmtPerc((totals.W / totals.M) * 100) : "-";
      const BPperc = totals.BP > 0 ? fmtPerc((totals.BP_Saved / totals.BP) * 100) : "-";

      const sum_2ndIn = Math.max(totals.svpt - totals.first_in, 0);
      const FirstIn = totals.svpt > 0 ? fmtPerc((totals.first_in / totals.svpt) * 100) : "-";
      const FirstWon = totals.first_in > 0 ? fmtPerc((totals.first_won / totals.first_in) * 100) : "-";
      const SecondWon = sum_2ndIn > 0 ? fmtPerc((totals.second_won / sum_2ndIn) * 100) : "-";

      return {
        Event: tourneyMatches[0].tourney_name,
        Years,
        Level,
        Surface,
        M: totals.M,
        W: totals.W,
        L,
        WinPerc,
        BP: totals.BP,
        BP_Saved: totals.BP_Saved,
        BP_Conceded: totals.BP_Conceded,
        BPperc,
        Best: bestRoundOf(tourneyMatches),
        Aces: totals.Aces,
        DF: totals.DF,
        FirstIn,
        FirstWon,
        SecondWon
      };
    });

    // Ordinamento Slam prima
    rows.sort((a, b) => {
      const aIndex = SLAM_ORDER.indexOf(a.Event);
      const bIndex = SLAM_ORDER.indexOf(b.Event);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.Event.localeCompare(b.Event);
    });

    return rows;
  }, [filteredMatches]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return summaryStats;
    return [...summaryStats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [summaryStats, sortConfig]);

  const handleSort = (key: keyof SummaryRow) => {
    setSortConfig(prev => prev?.key === key
      ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  };

  if (!summaryStats.length) {
    return <div className="mt-6 text-gray-200">No tournament data available with current filters.</div>;
  }

  const columns: (keyof SummaryRow)[] = [
    "Event","Years","Level","Surface","M","W","L","WinPerc","Best","Aces","DF","BP","BP_Saved","BP_Conceded","BPperc","FirstIn","FirstWon","SecondWon"
  ];

  return (
    <div className="mt-8 overflow-x-auto rounded bg-gray-900 shadow">
      <h3 className="text-base font-semibold mb-2 text-gray-200 px-2 pt-2">Summary Seasons</h3>
      <table className="min-w-full border-collapse text-gray-200 text-sm">
        <thead>
          <tr className="bg-black">
            {columns.map(k => (
              <th
                key={k}
                className="px-3 py-2 text-center text-sm text-gray-200 cursor-pointer select-none"
                onClick={() => handleSort(k)}
              >
                {k} {sortConfig?.key === k ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((stat, i) => (
            <tr key={`${stat.Event}-${i}`} className="even:bg-gray-800 odd:bg-gray-700">
              {columns.map(k => (
                <td key={`${k}-${i}`} className="px-3 py-1 text-center">
                  {typeof stat[k] === "number" ? fmtNum(stat[k] as number) : stat[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
