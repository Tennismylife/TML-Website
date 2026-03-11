"use client";

import {
  BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export interface PressureStats {
  winsDecidingSet: number; lossesDecidingSet: number;
  winsFifthSet: number; lossesFifthSet: number;
  winsAfterWin1st: number; lossesAfterWin1st: number;
  winsAfterLoss1st: number; lossesAfterLoss1st: number;
  winsAfterWin1st2nd: number; lossesAfterWin1st2nd: number;
  winsAfterLoss1st2nd: number; lossesAfterLoss1st2nd: number;
  winsDecidingTB: number; lossesDecidingTB: number;
}

interface Props {
  p1Stats: PressureStats;
  p2Stats: PressureStats;
  p1Name: string;
  p2Name: string;
}

const pct = (w: number, l: number) =>
  w + l > 0 ? +((w / (w + l)) * 100).toFixed(1) : null;

export default function H2HPressureRadarChart({ p1Stats, p2Stats, p1Name, p2Name }: Props) {
  const data = [
    { label: "Deciding Set",   p1: pct(p1Stats.winsDecidingSet,     p1Stats.lossesDecidingSet),     p2: pct(p2Stats.winsDecidingSet,     p2Stats.lossesDecidingSet),     p1W: p1Stats.winsDecidingSet,     p1L: p1Stats.lossesDecidingSet,     p2W: p2Stats.winsDecidingSet,     p2L: p2Stats.lossesDecidingSet },
    { label: "5th Set",        p1: pct(p1Stats.winsFifthSet,        p1Stats.lossesFifthSet),        p2: pct(p2Stats.winsFifthSet,        p2Stats.lossesFifthSet),        p1W: p1Stats.winsFifthSet,        p1L: p1Stats.lossesFifthSet,        p2W: p2Stats.winsFifthSet,        p2L: p2Stats.lossesFifthSet },
    { label: "After Win 1st",  p1: pct(p1Stats.winsAfterWin1st,    p1Stats.lossesAfterWin1st),    p2: pct(p2Stats.winsAfterWin1st,    p2Stats.lossesAfterWin1st),    p1W: p1Stats.winsAfterWin1st,    p1L: p1Stats.lossesAfterWin1st,    p2W: p2Stats.winsAfterWin1st,    p2L: p2Stats.lossesAfterWin1st },
    { label: "After Loss 1st", p1: pct(p1Stats.winsAfterLoss1st,   p1Stats.lossesAfterLoss1st),   p2: pct(p2Stats.winsAfterLoss1st,   p2Stats.lossesAfterLoss1st),   p1W: p1Stats.winsAfterLoss1st,   p1L: p1Stats.lossesAfterLoss1st,   p2W: p2Stats.winsAfterLoss1st,   p2L: p2Stats.lossesAfterLoss1st },
    { label: "Win 1+2",        p1: pct(p1Stats.winsAfterWin1st2nd, p1Stats.lossesAfterWin1st2nd), p2: pct(p2Stats.winsAfterWin1st2nd, p2Stats.lossesAfterWin1st2nd), p1W: p1Stats.winsAfterWin1st2nd, p1L: p1Stats.lossesAfterWin1st2nd, p2W: p2Stats.winsAfterWin1st2nd, p2L: p2Stats.lossesAfterWin1st2nd },
    { label: "Loss 1+2",       p1: pct(p1Stats.winsAfterLoss1st2nd,p1Stats.lossesAfterLoss1st2nd),p2: pct(p2Stats.winsAfterLoss1st2nd,p2Stats.lossesAfterLoss1st2nd),p1W: p1Stats.winsAfterLoss1st2nd,p1L: p1Stats.lossesAfterLoss1st2nd,p2W: p2Stats.winsAfterLoss1st2nd,p2L: p2Stats.lossesAfterLoss1st2nd },
    { label: "Deciding TB",    p1: pct(p1Stats.winsDecidingTB,     p1Stats.lossesDecidingTB),     p2: pct(p2Stats.winsDecidingTB,     p2Stats.lossesDecidingTB),     p1W: p1Stats.winsDecidingTB,     p1L: p1Stats.lossesDecidingTB,     p2W: p2Stats.winsDecidingTB,     p2L: p2Stats.lossesDecidingTB },
  ].filter((d) => d.p1 !== null || d.p2 !== null);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 40, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#9ca3af", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px" }}>
                  <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4, fontSize: 12 }}>{label}</p>
                  {payload.map((e) => (
                    <p key={e.name} style={{ color: e.color, fontSize: 12, margin: "2px 0" }}>
                      {e.name}: <strong>{e.value}%</strong>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="p1" name={p1Name} fill="#3b82f6" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="p1" position="top" content={(props: any) => {
              const { x, y, width, value, index } = props;
              const entry = data[index];
              if (value == null) return null;
              const cx = (x ?? 0) + (width ?? 0) / 2;
              const cy = y ?? 0;
              return (
                <g>
                  <text x={cx} y={cy - 18} textAnchor="middle" fill="#60a5fa" fontSize={11} fontWeight={700}>{`${value}%`}</text>
                  {entry && entry.p1W + entry.p1L > 0 && (
                    <text x={cx} y={cy - 5} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={600}>{`${entry.p1W}-${entry.p1L}`}</text>
                  )}
                </g>
              );
            }} />
          </Bar>
          <Bar dataKey="p2" name={p2Name} fill="#ef4444" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="p2" position="top" content={(props: any) => {
              const { x, y, width, value, index } = props;
              const entry = data[index];
              if (value == null) return null;
              const cx = (x ?? 0) + (width ?? 0) / 2;
              const cy = y ?? 0;
              return (
                <g>
                  <text x={cx} y={cy - 18} textAnchor="middle" fill="#f87171" fontSize={11} fontWeight={700}>{`${value}%`}</text>
                  {entry && entry.p2W + entry.p2L > 0 && (
                    <text x={cx} y={cy - 5} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={600}>{`${entry.p2W}-${entry.p2L}`}</text>
                  )}
                </g>
              );
            }} />
          </Bar>
          <Legend
            formatter={(value) => <span style={{ color: value === p1Name ? "#60a5fa" : "#f87171", fontSize: 14 }}>{value}</span>}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


