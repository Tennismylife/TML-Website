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

const THRESHOLDS = [
  { label: '#1',    value: 1 },
  { label: 'Top 2',  value: 2 },
  { label: 'Top 3',  value: 3 },
  { label: 'Top 5',  value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
  { label: 'Top 50', value: 50 },
  { label: 'Top 100', value: 100 },
];

import RankingTable, { TH_BASE, TD_BASE, TD_LABEL } from './RankingTable';

export default function RankingWeeksTable({ data, className }: Props) {
  if (!data.length) return null;

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
  const eoyEntries = Array.from(eoyMap.values());

  return (
    <RankingTable className={className}>
      <thead>
        <tr className="bg-black">
          <th className={`${TH_BASE} text-left`}>Weeks at</th>
          <th className={TH_BASE}>Overall</th>
          <th className={TH_BASE}>End of year</th>
        </tr>
      </thead>
      <tbody>
        {THRESHOLDS.map(({ label, value }) => {
          const overall = data.filter((e) => e.rank <= value).length;
          const eoy = eoyEntries.filter((e) => e.rank <= value).length;
          return (
            <tr key={value} className="hover:bg-gray-800 border-b border-white/10">
              <td className={`${TD_BASE} ${TD_LABEL}`}>{label}</td>
              <td className={`${TD_BASE} text-center text-lg font-bold text-white`}>
                {overall > 0 ? overall : <span className="text-gray-600">—</span>}
              </td>
              <td className={`${TD_BASE} text-center text-lg font-bold text-white`}>
                {eoy > 0 ? eoy : <span className="text-gray-600">—</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </RankingTable>
  );
}
