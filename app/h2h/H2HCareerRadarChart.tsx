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

export interface CareerStats {
  percAll: number;
  winsHard: number;
  lossesHard: number;
  winsClay: number;
  lossesClay: number;
  winsGrass: number;
  lossesGrass: number;
  winsCarpet: number;
  lossesCarpet: number;
}

interface Props {
  p1Stats: CareerStats;
  p2Stats: CareerStats;
  p1Name: string;
  p2Name: string;
}

const pct = (w: number, l: number) =>
  w + l > 0 ? +((w / (w + l)) * 100).toFixed(2) : 0;

export default function H2HCareerRadarChart({ p1Stats, p2Stats, p1Name, p2Name }: Props) {
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
      subject: "Total",
      [p1Name]: +p1Stats.percAll.toFixed(2),
      [p2Name]: +p2Stats.percAll.toFixed(2),
    },
    {
      subject: "Hard",
      [p1Name]: pct(p1Stats.winsHard, p1Stats.lossesHard),
      [p2Name]: pct(p2Stats.winsHard, p2Stats.lossesHard),
    },
    {
      subject: "Clay",
      [p1Name]: pct(p1Stats.winsClay, p1Stats.lossesClay),
      [p2Name]: pct(p2Stats.winsClay, p2Stats.lossesClay),
    },
    {
      subject: "Grass",
      [p1Name]: pct(p1Stats.winsGrass, p1Stats.lossesGrass),
      [p2Name]: pct(p2Stats.winsGrass, p2Stats.lossesGrass),
    },
    {
      subject: "Carpet",
      [p1Name]: pct(p1Stats.winsCarpet, p1Stats.lossesCarpet),
      [p2Name]: pct(p2Stats.winsCarpet, p2Stats.lossesCarpet),
    },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={700}>
        <RadarChart data={data} margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#d1d5db", fontSize: 14, fontWeight: 600 }}
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
