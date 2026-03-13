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

function rankColor(rank: number): string {
  if (rank === 1)   return "#fde047"; // gold  – #1
  if (rank <= 3)    return "#fb923c"; // orange – Top 3
  if (rank <= 5)    return "#f97316"; // amber  – Top 5
  if (rank <= 10)   return "#38bdf8"; // sky    – Top 10
  if (rank <= 20)   return "#4ade80"; // green  – Top 20
  if (rank <= 50)   return "#a78bfa"; // violet – Top 50
  if (rank <= 100)  return "#94a3b8"; // slate  – Top 100
  return "#6b7280";                   // gray   – outside Top 100
}

export default function EndOfYearRanks({ data, className }: Props) {
  // Build map: year -> latest entry for that year
  const map = new Map<number, { iso: string; rank: number }>();
  data.forEach((e) => {
    if (!e.date) return;
    const iso = String(e.date);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const prev = map.get(y);
    if (!prev || iso > prev.iso) map.set(y, { iso, rank: e.rank });
  });

  const rows = Array.from(map.entries())
    .map(([year, v]) => ({ year, iso: v.iso, rank: v.rank }))
    .sort((a, b) => a.year - b.year);

  if (!rows.length) return null;

  return (
    <div className={`${className ?? ''} flex justify-center`}>
      <div>
        <div className="mb-3 text-sm text-gray-300 text-center">End‑of‑year rankings</div>

        <div className="inline-flex gap-2 overflow-x-auto py-2">
          {rows.map((r) => (
            <div key={r.year} className="flex-shrink-0 w-[68px] bg-gray-800 border border-gray-700 rounded p-1.5 flex flex-col items-center justify-center">
              <div
                className="text-base font-semibold leading-5"
                style={{ color: rankColor(r.rank), WebkitTextFillColor: rankColor(r.rank) }}
              >
                {r.rank ?? '-'}
              </div>
              <div className="text-[11px] text-gray-300 mt-1">{r.year}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
