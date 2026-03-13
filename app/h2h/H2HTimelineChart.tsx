"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Player {
  id: string;
  atpname: string | null;
  ioc?: string | null;
}

interface Match {
  id: number;
  tourney_date: Date | null;
  tourney_name: string | null;
  winner_id: string | null;
  winner_name: string | null;
  loser_name: string | null;
  round: string | null;
  score: string | null;
  surface: string | null;
  status: boolean | null;
}

interface Props {
  matches: Match[];
  player1: Player;
  player2: Player;
}

const SURFACE_COLORS: Record<string, string> = {
  Hard: "#60a5fa",
  Clay: "#f97316",
  Grass: "#4ade80",
  Carpet: "#c084fc",
};

// Custom dot is defined as a component so that recharts can render it
// for each data point and assign unique keys internally. Passing a
// React element (`<CustomDot />`) would cause the `Dots` container to
// clone the same node repeatedly without a key, triggering the warning
// seen in the console.
const CustomDot = (props: any): React.ReactElement<SVGElement> => {
  const { cx, cy, payload, index } = props;
  const color = SURFACE_COLORS[payload?.surface] ?? "#9ca3af";
  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill={color} stroke="#1f2937" strokeWidth={1.5} />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f1f5f9", minWidth: 190 }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>Match #{d.matchNum}</p>
      <p style={{ color: "#94a3b8", marginBottom: 6 }}>{d.tourney} · {d.round} · {d.year}</p>
      <p style={{ marginBottom: 2 }}>
        <span style={{ color: "#60a5fa", fontWeight: 700 }}>Winner: </span>{d.winner}
      </p>
      <p style={{ marginBottom: 6, color: "#94a3b8", fontSize: 12 }}>{d.score}</p>
      <p style={{ fontWeight: 700 }}>
        Series: <span style={{ color: "#60a5fa" }}>{d.w1}</span>
        {" – "}
        <span style={{ color: "#f87171" }}>{d.w2}</span>
      </p>
    </div>
  );
};

export default function H2HTimelineChart({ matches, player1, player2 }: Props) {
  // Sort oldest → newest
  const sorted = [...matches].sort((a, b) => {
    const da = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
    const db = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
    return da - db;
  });

  let w1 = 0;
  let w2 = 0;

  const data = sorted.map((m, i) => {
    const p1won = String(m.winner_id) === String(player1.id);
    if (p1won) w1++; else w2++;
    const year = m.tourney_date ? new Date(m.tourney_date).getFullYear() : "?";
    return {
      matchNum: i + 1,
      [player1.atpname ?? "P1"]: w1,
      [player2.atpname ?? "P2"]: w2,
      w1,
      w2,
      label: `${w1}–${w2}`,
      winner: p1won ? player1.atpname : player2.atpname,
      tourney: m.tourney_name ?? "",
      round: m.round ?? "",
      score: m.score ?? "",
      surface: m.surface ?? "",
      year,
    };
  });

  const p1Name = player1.atpname ?? "P1";
  const p2Name = player2.atpname ?? "P2";
  const maxWins = Math.max(w1, w2);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-1 text-center text-gray-300">H2H Series Progression</h2>
      <p className="text-xs text-center text-gray-500 mb-4 flex items-center justify-center gap-3">
        {Object.entries(SURFACE_COLORS).map(([surface, color]) => (
          <span key={surface} className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
            <span style={{ color }}>{surface}</span>
          </span>
        ))}
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="matchNum"
            label={{ value: "Match #", position: "insideBottomRight", offset: -10, fill: "#9ca3af", fontSize: 12 }}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <YAxis
            domain={[0, maxWins + 1]}
            allowDecimals={false}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span style={{ color: value === p1Name ? "#60a5fa" : "#f87171", fontWeight: 600, fontSize: 13 }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey={p1Name}
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={CustomDot}
            activeDot={{ r: 7, fill: "#60a5fa" }}
          />
          <Line
            type="monotone"
            dataKey={p2Name}
            stroke="#f87171"
            strokeWidth={2.5}
            dot={CustomDot}
            activeDot={{ r: 7, fill: "#f87171" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
