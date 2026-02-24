"use client";

import { useRef, useLayoutEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface RoundStats {
  winsFinal: number;
  lossesFinal: number;
  winsSF: number;
  lossesSF: number;
  winsQF: number;
  lossesQF: number;
  winsR16: number;
  lossesR16: number;
  winsR32: number;
  lossesR32: number;
  winsR64: number;
  lossesR64: number;
  winsR128: number;
  lossesR128: number;
}

interface Props {
  p1Stats: RoundStats;
  p2Stats: RoundStats;
  p1Name: string;
  p2Name: string;
}

const pct = (w: number, l: number) =>
  w + l > 0 ? +((w / (w + l)) * 100).toFixed(2) : 0;

export default function H2HRoundRadarChart({ p1Stats, p2Stats, p1Name, p2Name }: Props) {
  const legendRef = useRef<HTMLDivElement>(null);

  const applyColors = () => {
    const el1 = legendRef.current?.querySelector<HTMLElement>('[data-h2h-color="blue"]');
    const el2 = legendRef.current?.querySelector<HTMLElement>('[data-h2h-color="red"]');
    const neutralize = (el: HTMLElement) => {
      el.style.setProperty('text-shadow', 'none', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('-webkit-text-stroke-width', '0', 'important');
      el.style.setProperty('mix-blend-mode', 'normal', 'important');
      el.style.setProperty('filter', 'none', 'important');
    };
    if (el1) {
      el1.style.setProperty('color', '#60a5fa', 'important');
      el1.style.setProperty('-webkit-text-fill-color', '#60a5fa', 'important');
      neutralize(el1);
    }
    if (el2) {
      el2.style.setProperty('color', '#f87171', 'important');
      el2.style.setProperty('-webkit-text-fill-color', '#f87171', 'important');
      neutralize(el2);
    }
  };

  useLayoutEffect(() => {
    applyColors();
    const t = setTimeout(applyColors, 0);
    const t2 = setTimeout(applyColors, 300);
    return () => { clearTimeout(t); clearTimeout(t2); };
  });

  const data = [
    {
      subject: "Final",
      [p1Name]: pct(p1Stats.winsFinal, p1Stats.lossesFinal),
      [p2Name]: pct(p2Stats.winsFinal, p2Stats.lossesFinal),
    },
    {
      subject: "Semifinal",
      [p1Name]: pct(p1Stats.winsSF, p1Stats.lossesSF),
      [p2Name]: pct(p2Stats.winsSF, p2Stats.lossesSF),
    },
    {
      subject: "Quarterfinal",
      [p1Name]: pct(p1Stats.winsQF, p1Stats.lossesQF),
      [p2Name]: pct(p2Stats.winsQF, p2Stats.lossesQF),
    },
    {
      subject: "R16",
      [p1Name]: pct(p1Stats.winsR16, p1Stats.lossesR16),
      [p2Name]: pct(p2Stats.winsR16, p2Stats.lossesR16),
    },
    {
      subject: "R32",
      [p1Name]: pct(p1Stats.winsR32, p1Stats.lossesR32),
      [p2Name]: pct(p2Stats.winsR32, p2Stats.lossesR32),
    },
    {
      subject: "R64",
      [p1Name]: pct(p1Stats.winsR64, p1Stats.lossesR64),
      [p2Name]: pct(p2Stats.winsR64, p2Stats.lossesR64),
    },
    {
      subject: "R128",
      [p1Name]: pct(p1Stats.winsR128, p1Stats.lossesR128),
      [p2Name]: pct(p2Stats.winsR128, p2Stats.lossesR128),
    },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={700}>
        <RadarChart data={data} margin={{ top: 20, right: 70, bottom: 20, left: 70 }}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#d1d5db", fontSize: 13, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={6}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Radar
            name={p1Name}
            dataKey={p1Name}
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.25}
            dot={{ fill: "#60a5fa", r: 3 }}
          />
          <Radar
            name={p2Name}
            dataKey={p2Name}
            stroke="#f87171"
            fill="#f87171"
            fillOpacity={0.25}
            dot={{ fill: "#f87171", r: 3 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</p>
                  {payload.map((entry) => (
                    <p key={entry.name} style={{ color: entry.color, fontSize: 13, margin: "2px 0" }}>
                      {entry.name}: <strong>{entry.value}%</strong>
                    </p>
                  ))}
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div ref={legendRef} className="flex items-center justify-center gap-8 mt-2">
        <div className="flex items-center gap-2">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: '#60a5fa' }} />
          <span data-h2h-color="blue" style={{ fontSize: 13, fontWeight: 600 }}>{p1Name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f87171' }} />
          <span data-h2h-color="red" style={{ fontSize: 13, fontWeight: 600 }}>{p2Name}</span>
        </div>
      </div>
    </div>
  );
}
