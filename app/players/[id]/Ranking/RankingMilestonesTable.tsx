import React from 'react';
import RankingTable, { TH_BASE, TD_BASE, TD_LABEL } from './RankingTable';

interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface Props {
  data: Entry[];
  birthdate?: string | null;
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

function ageAt(birthdate: string, eventDate: string): string {
  const b = new Date(birthdate);
  const e = new Date(eventDate);
  if (isNaN(b.getTime()) || isNaN(e.getTime())) return '';
  const totalDays = Math.floor((e.getTime() - b.getTime()) / 86_400_000);
  if (totalDays < 0) return '';
  const bYear = new Date(e.getFullYear(), b.getMonth(), b.getDate());
  let years = e.getFullYear() - b.getFullYear();
  if (e < bYear) years--;
  const bYearActual = new Date(b.getFullYear() + years, b.getMonth(), b.getDate());
  const remDays = Math.floor((e.getTime() - bYearActual.getTime()) / 86_400_000);
  return `${years}y ${remDays}d`;
}

const THRESHOLDS: { label: string; value: number }[] = [
  { label: '#1', value: 1 },
  { label: 'Top 2', value: 2 },
  { label: 'Top 3', value: 3 },
  { label: 'Top 5', value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
  { label: 'Top 50', value: 50 },
  { label: 'Top 100', value: 100 },
];

export default function RankingMilestonesTable({ data, birthdate, className }: Props) {
  if (!data.length) return null;

  // sort entries by date ascending, ignoring invalid
  const sorted = [...data]
    .filter((e) => e.date && !isNaN(new Date(e.date).getTime()))
    .sort((a, b) => (new Date(a.date!).getTime() - new Date(b.date!).getTime()));

  const rows = THRESHOLDS.map(({ label, value }) => {
    let first: Entry | null = null;
    let last: Entry | null = null;
    for (const e of sorted) {
      if (e.rank <= value) {
        if (!first) first = e;
        last = e;
      }
    }
    const firstDate = first ? formatDate(first.date) : '-';
    const lastDate = last ? formatDate(last.date) : '-';
    const firstAge = first && birthdate && first.date ? ageAt(birthdate, first.date) : '';
    const lastAge = last && birthdate && last.date ? ageAt(birthdate, last.date) : '';

    return {
      label,
      first: firstDate + (firstAge ? ` (${firstAge})` : ''),
      last: lastDate + (lastAge ? ` (${lastAge})` : ''),
    };
  });

  return (
    <RankingTable className={className}>
      <thead>
        <tr className="bg-black">
          <th className={`${TH_BASE} text-left`}>Threshold</th>
          <th className={TH_BASE}>First time</th>
          <th className={TH_BASE}>Last time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="hover:bg-gray-800 border-b border-white/10">
            <td className={`${TD_BASE} ${TD_LABEL}`}>{r.label}</td>
            <td className={`${TD_BASE} text-center`}>{r.first}</td>
            <td className={`${TD_BASE} text-center`}>{r.last}</td>
          </tr>
        ))}
      </tbody>
    </RankingTable>
  );
}