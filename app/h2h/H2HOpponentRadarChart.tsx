"use client";

export interface OpponentStats {
  winsVsYounger: number; lossesVsYounger: number;
  winsVsOlder: number; lossesVsOlder: number;
  winsVsRight: number; lossesVsRight: number;
  winsVsLeft: number; lossesVsLeft: number;
  winsVsTwoHandedBH: number; lossesVsTwoHandedBH: number;
  winsVsOneHandedBH: number; lossesVsOneHandedBH: number;
  winsVsShorter: number; lossesVsShorter: number;
  winsVsTaller: number; lossesVsTaller: number;
}

interface Props {
  p1Stats: OpponentStats;
  p2Stats: OpponentStats;
  p1Name: string;
  p2Name: string;
}

const pct = (w: number, l: number) =>
  w + l > 0 ? +((w / (w + l)) * 100).toFixed(1) : null;

function WinPctRow({ label, p1, p2, p1W, p1L, p2W, p2L }: { label: string; p1: number | null; p2: number | null; p1W: number; p1L: number; p2W: number; p2L: number }) {
  if (p1 === null && p2 === null) return null;
  const v1 = p1 ?? 0;
  const v2 = p2 ?? 0;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 sm:gap-x-3 py-1.5 min-w-0">
      <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-[10px] sm:text-xs font-bold tabular-nums ${v1 >= v2 ? "text-blue-300" : "text-gray-500"}`}>
            {p1 !== null ? `${v1}%` : "—"}
          </span>
          {p1W + p1L > 0 && (
            <span className="text-[9px] sm:text-[10px] text-gray-500 tabular-nums">{p1W}-{p1L}</span>
          )}
        </div>
        <div className="w-12 sm:w-24 h-3 bg-gray-700 rounded-full overflow-hidden flex justify-end shrink-0">
          <div className="h-full rounded-full bg-blue-500" style={{ width: p1 !== null ? `${v1}%` : "0%" }} />
        </div>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 text-center px-0.5 sm:px-1 leading-tight max-w-[70px] sm:max-w-none sm:whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <div className="w-12 sm:w-24 h-3 bg-gray-700 rounded-full overflow-hidden shrink-0">
          <div className="h-full rounded-full bg-red-500" style={{ width: p2 !== null ? `${v2}%` : "0%" }} />
        </div>
        <div className="flex flex-col items-start shrink-0">
          <span className={`text-[10px] sm:text-xs font-bold tabular-nums ${v2 >= v1 ? "text-red-300" : "text-gray-500"}`}>
            {p2 !== null ? `${v2}%` : "—"}
          </span>
          {p2W + p2L > 0 && (
            <span className="text-[9px] sm:text-[10px] text-gray-500 tabular-nums">{p2W}-{p2L}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function H2HOpponentRadarChart({ p1Stats, p2Stats, p1Name, p2Name }: Props) {
  const rows = [
    { label: "Vs Younger",      p1: pct(p1Stats.winsVsYounger,    p1Stats.lossesVsYounger),    p2: pct(p2Stats.winsVsYounger,    p2Stats.lossesVsYounger),    p1W: p1Stats.winsVsYounger,    p1L: p1Stats.lossesVsYounger,    p2W: p2Stats.winsVsYounger,    p2L: p2Stats.lossesVsYounger },
    { label: "Vs Older",        p1: pct(p1Stats.winsVsOlder,      p1Stats.lossesVsOlder),      p2: pct(p2Stats.winsVsOlder,      p2Stats.lossesVsOlder),      p1W: p1Stats.winsVsOlder,      p1L: p1Stats.lossesVsOlder,      p2W: p2Stats.winsVsOlder,      p2L: p2Stats.lossesVsOlder },
    { label: "Vs Right-Handed", p1: pct(p1Stats.winsVsRight,      p1Stats.lossesVsRight),      p2: pct(p2Stats.winsVsRight,      p2Stats.lossesVsRight),      p1W: p1Stats.winsVsRight,      p1L: p1Stats.lossesVsRight,      p2W: p2Stats.winsVsRight,      p2L: p2Stats.lossesVsRight },
    { label: "Vs Left-Handed",  p1: pct(p1Stats.winsVsLeft,       p1Stats.lossesVsLeft),       p2: pct(p2Stats.winsVsLeft,       p2Stats.lossesVsLeft),       p1W: p1Stats.winsVsLeft,       p1L: p1Stats.lossesVsLeft,       p2W: p2Stats.winsVsLeft,       p2L: p2Stats.lossesVsLeft },
    { label: "Vs 2H Backhand",  p1: pct(p1Stats.winsVsTwoHandedBH,p1Stats.lossesVsTwoHandedBH),p2: pct(p2Stats.winsVsTwoHandedBH,p2Stats.lossesVsTwoHandedBH),p1W: p1Stats.winsVsTwoHandedBH,p1L: p1Stats.lossesVsTwoHandedBH,p2W: p2Stats.winsVsTwoHandedBH,p2L: p2Stats.lossesVsTwoHandedBH },
    { label: "Vs 1H Backhand",  p1: pct(p1Stats.winsVsOneHandedBH,p1Stats.lossesVsOneHandedBH),p2: pct(p2Stats.winsVsOneHandedBH,p2Stats.lossesVsOneHandedBH),p1W: p1Stats.winsVsOneHandedBH,p1L: p1Stats.lossesVsOneHandedBH,p2W: p2Stats.winsVsOneHandedBH,p2L: p2Stats.lossesVsOneHandedBH },
    { label: "Vs Shorter",      p1: pct(p1Stats.winsVsShorter,    p1Stats.lossesVsShorter),    p2: pct(p2Stats.winsVsShorter,    p2Stats.lossesVsShorter),    p1W: p1Stats.winsVsShorter,    p1L: p1Stats.lossesVsShorter,    p2W: p2Stats.winsVsShorter,    p2L: p2Stats.lossesVsShorter },
    { label: "Vs Taller",       p1: pct(p1Stats.winsVsTaller,     p1Stats.lossesVsTaller),     p2: pct(p2Stats.winsVsTaller,     p2Stats.lossesVsTaller),     p1W: p1Stats.winsVsTaller,     p1L: p1Stats.lossesVsTaller,     p2W: p2Stats.winsVsTaller,     p2L: p2Stats.lossesVsTaller },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-[1fr_auto_1fr] text-center mb-1 px-1">
        <span className="text-xs font-semibold text-blue-400 text-right pr-3">{p1Name}</span>
        <span />
        <span className="text-xs font-semibold text-red-400 text-left pl-3">{p2Name}</span>
      </div>
      <div className="divide-y divide-gray-800">
        {rows.map((r) => <WinPctRow key={r.label} label={r.label} p1={r.p1} p2={r.p2} p1W={r.p1W} p1L={r.p1L} p2W={r.p2W} p2L={r.p2L} />)}
      </div>
    </div>
  );
}
