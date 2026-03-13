import React from 'react';

interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface Props {
  data: Entry[];
  className?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

import RankingTable, { TH_BASE, TD_BASE, TD_LABEL } from './RankingTable';

export default function RankingStatsTable({ data, className }: Props) {
  if (!data.length) return null;

  // ── Best ranking (lowest rank number) ────────────────────────────
  let bestRankEntry = data[0];
  for (const e of data) {
    if (e.rank < bestRankEntry.rank) bestRankEntry = e;
  }

  // ── Best ATP points (highest points) ─────────────────────────────
  let bestPointsEntry = data[0];
  for (const e of data) {
    if (e.points > bestPointsEntry.points) bestPointsEntry = e;
  }

  // ── End-of-year entries: last entry per calendar year ────────────
  const eoyMap = new Map<number, Entry>();
  for (const e of data) {
    if (!e.date) continue;
    const d = new Date(e.date);
    if (isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const prev = eoyMap.get(y);
    if (!prev || e.date > (prev.date ?? '')) eoyMap.set(y, e);
  }
  const eoyEntries = Array.from(eoyMap.entries()); // [year, entry][]

  // best EOY rank
  let bestEoyRankYear = -1;
  let bestEoyRankEntry: Entry | null = null;
  for (const [year, e] of eoyEntries) {
    if (!bestEoyRankEntry || e.rank < bestEoyRankEntry.rank) {
      bestEoyRankEntry = e;
      bestEoyRankYear = year;
    }
  }

  // best EOY points
  let bestEoyPointsYear = -1;
  let bestEoyPointsEntry: Entry | null = null;
  for (const [year, e] of eoyEntries) {
    if (!bestEoyPointsEntry || e.points > bestEoyPointsEntry.points) {
      bestEoyPointsEntry = e;
      bestEoyPointsYear = year;
    }
  }

  // ── Most frequent rank (mode) ─────────────────────────────────────
  const freq = new Map<number, number>();
  for (const e of data) freq.set(e.rank, (freq.get(e.rank) ?? 0) + 1);
  let modeRank = data[0].rank;
  let modeCount = 0;
  freq.forEach((count, rank) => {
    if (count > modeCount) { modeCount = count; modeRank = rank; }
  });

  const rows: { label: string; value: React.ReactNode; detail: React.ReactNode }[] = [
    {
      label: 'Best ranking',
      value: <span className="font-bold text-yellow-300">#{bestRankEntry.rank}</span>,
      detail: <span className="text-gray-400 text-sm">{formatDate(bestRankEntry.date)}</span>,
    },
    {
      label: 'Best ATP points',
      value: <span className="font-bold text-yellow-300">{bestPointsEntry.points.toLocaleString()}</span>,
      detail: <span className="text-gray-400 text-sm">{formatDate(bestPointsEntry.date)}</span>,
    },
    {
      label: 'Best end-of-year rank',
      value: <span className="font-bold text-yellow-300">#{bestEoyRankEntry?.rank ?? '-'}</span>,
      detail: <span className="text-gray-400 text-sm">{bestEoyRankYear > 0 ? String(bestEoyRankYear) : '-'}</span>,
    },
    {
      label: 'Best end-of-year points',
      value: <span className="font-bold text-yellow-300">{bestEoyPointsEntry ? bestEoyPointsEntry.points.toLocaleString() : '-'}</span>,
      detail: <span className="text-gray-400 text-sm">{bestEoyPointsYear > 0 ? String(bestEoyPointsYear) : '-'}</span>,
    },
    {
      label: 'Most frequent rank',
      value: <span className="font-bold text-yellow-300">#{modeRank}</span>,
      detail: <span className="text-gray-400 text-sm">{modeCount} week{modeCount !== 1 ? 's' : ''}</span>,
    },
  ];

  return (
    <RankingTable className={className}>
      <thead>
        <tr className="bg-black">
          <th className={`${TH_BASE} text-left`} colSpan={3}>
            Career ranking stats
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-800 border-b border-white/10">
            <td className={`${TD_BASE} ${TD_LABEL}`}>
              {r.label}
            </td>
            <td className={`${TD_BASE} text-center text-lg`}>{r.value}</td>
            <td className={`${TD_BASE} text-center`}>{r.detail}</td>
          </tr>
        ))}
      </tbody>
    </RankingTable>
  );
}
