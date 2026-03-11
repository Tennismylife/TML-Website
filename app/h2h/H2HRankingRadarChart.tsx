"use client";

export interface RankingStats {
  winsVsTop1: number; lossesVsTop1: number;
  winsVsTop5: number; lossesVsTop5: number;
  winsVsTop10: number; lossesVsTop10: number;
  winsVsTop20: number; lossesVsTop20: number;
  winsVsTop100: number; lossesVsTop100: number;
  winsVsOutside100: number; lossesVsOutside100: number;
  winsVsHigher: number; lossesVsHigher: number;
  winsVsLower: number; lossesVsLower: number;
}

interface Props {
  p1Stats: RankingStats;
  p2Stats: RankingStats;
  p1Name: string;
  p2Name: string;
}

const pct = (w: number, l: number) =>
  w + l > 0 ? +((w / (w + l)) * 100).toFixed(1) : null;

function WinPctRow({
  label, p1, p2, p1Name, p2Name, p1W, p1L, p2W, p2L,
}: { label: string; p1: number | null; p2: number | null; p1Name: string; p2Name: string; p1W: number; p1L: number; p2W: number; p2L: number }) {
  if (p1 === null && p2 === null) return null;
  const v1 = p1 ?? 0;
  const v2 = p2 ?? 0;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 py-1.5">
      {/* P1 bar (right-aligned) */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex flex-col items-end">
          <span className={`text-xs font-bold tabular-nums ${v1 >= v2 ? "text-blue-300" : "text-gray-500"}`}>
            {p1 !== null ? `${v1}%` : "—"}
          </span>
          {p1W + p1L > 0 && (
            <span className="text-[10px] text-gray-500 tabular-nums">{p1W}-{p1L}</span>
          )}
        </div>
        <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: p1 !== null ? `${v1}%` : "0%" }}
          />
        </div>
      </div>
      {/* Label */}
      <span className="text-xs text-gray-400 text-center whitespace-nowrap px-1">{label}</span>
      {/* P2 bar (left-aligned) */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-red-500"
            style={{ width: p2 !== null ? `${v2}%` : "0%" }}
          />
        </div>
        <div className="flex flex-col items-start">
          <span className={`text-xs font-bold tabular-nums ${v2 >= v1 ? "text-red-300" : "text-gray-500"}`}>
            {p2 !== null ? `${v2}%` : "—"}
          </span>
          {p2W + p2L > 0 && (
            <span className="text-[10px] text-gray-500 tabular-nums">{p2W}-{p2L}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function H2HRankingRadarChart({ p1Stats, p2Stats, p1Name, p2Name }: Props) {
  const rows = [
    { label: "vs Top 1",    p1: pct(p1Stats.winsVsTop1,       p1Stats.lossesVsTop1),       p2: pct(p2Stats.winsVsTop1,       p2Stats.lossesVsTop1),       p1W: p1Stats.winsVsTop1,       p1L: p1Stats.lossesVsTop1,       p2W: p2Stats.winsVsTop1,       p2L: p2Stats.lossesVsTop1 },
    { label: "vs Top 5",    p1: pct(p1Stats.winsVsTop5,       p1Stats.lossesVsTop5),       p2: pct(p2Stats.winsVsTop5,       p2Stats.lossesVsTop5),       p1W: p1Stats.winsVsTop5,       p1L: p1Stats.lossesVsTop5,       p2W: p2Stats.winsVsTop5,       p2L: p2Stats.lossesVsTop5 },
    { label: "vs Top 10",   p1: pct(p1Stats.winsVsTop10,      p1Stats.lossesVsTop10),      p2: pct(p2Stats.winsVsTop10,      p2Stats.lossesVsTop10),      p1W: p1Stats.winsVsTop10,      p1L: p1Stats.lossesVsTop10,      p2W: p2Stats.winsVsTop10,      p2L: p2Stats.lossesVsTop10 },
    { label: "vs Top 20",   p1: pct(p1Stats.winsVsTop20,      p1Stats.lossesVsTop20),      p2: pct(p2Stats.winsVsTop20,      p2Stats.lossesVsTop20),      p1W: p1Stats.winsVsTop20,      p1L: p1Stats.lossesVsTop20,      p2W: p2Stats.winsVsTop20,      p2L: p2Stats.lossesVsTop20 },
    { label: "vs Top 100",  p1: pct(p1Stats.winsVsTop100,     p1Stats.lossesVsTop100),     p2: pct(p2Stats.winsVsTop100,     p2Stats.lossesVsTop100),     p1W: p1Stats.winsVsTop100,     p1L: p1Stats.lossesVsTop100,     p2W: p2Stats.winsVsTop100,     p2L: p2Stats.lossesVsTop100 },
    { label: "vs +100",     p1: pct(p1Stats.winsVsOutside100, p1Stats.lossesVsOutside100), p2: pct(p2Stats.winsVsOutside100, p2Stats.lossesVsOutside100), p1W: p1Stats.winsVsOutside100, p1L: p1Stats.lossesVsOutside100, p2W: p2Stats.winsVsOutside100, p2L: p2Stats.lossesVsOutside100 },
    { label: "vs Higher",   p1: pct(p1Stats.winsVsHigher,     p1Stats.lossesVsHigher),     p2: pct(p2Stats.winsVsHigher,     p2Stats.lossesVsHigher),     p1W: p1Stats.winsVsHigher,     p1L: p1Stats.lossesVsHigher,     p2W: p2Stats.winsVsHigher,     p2L: p2Stats.lossesVsHigher },
    { label: "vs Lower",    p1: pct(p1Stats.winsVsLower,      p1Stats.lossesVsLower),      p2: pct(p2Stats.winsVsLower,      p2Stats.lossesVsLower),      p1W: p1Stats.winsVsLower,      p1L: p1Stats.lossesVsLower,      p2W: p2Stats.winsVsLower,      p2L: p2Stats.lossesVsLower },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] text-center mb-1 px-1">
        <span className="text-xs font-semibold text-blue-400 text-right pr-3">{p1Name}</span>
        <span />
        <span className="text-xs font-semibold text-red-400 text-left pl-3">{p2Name}</span>
      </div>
      <div className="divide-y divide-gray-800">
        {rows.map((r) => (
          <WinPctRow key={r.label} label={r.label} p1={r.p1} p2={r.p2} p1Name={p1Name} p2Name={p2Name} p1W={r.p1W} p1L={r.p1L} p2W={r.p2W} p2L={r.p2L} />
        ))}
      </div>
    </div>
  );
}
