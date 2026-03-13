"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import EndOfYearRanks from './EndOfYearRanks';
import RankingStatsTable from './RankingStatsTable';
import RankingWeeksTable from './RankingWeeksTable';
import RankingMilestonesTable from './RankingMilestonesTable';
import WeeklyMomentum from './WeeklyMomentum';
import ConsistencyScore from './ConsistencyScore';

interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface RankHistoryProps {
  playerId: string;
  birthdate?: string | null;
  narrativeSlot?: React.ReactNode;
}

/* ── milestone config ───────────────────────────────────────────────── */
const MILESTONES = [
  { threshold: 1,   label: '#1',      color: '#facc15' },
  { threshold: 2,   label: 'Top 2',   color: '#e2e8f0' },
  { threshold: 5,   label: 'Top 5',   color: '#fb923c' },
  { threshold: 10,  label: 'Top 10',  color: '#22d3ee' },
  { threshold: 50,  label: 'Top 50',  color: '#4ade80' },
  { threshold: 100, label: 'Top 100', color: '#94a3b8' },
];

function ageAt(birthdate: string, eventDate: string): string {
  const b = new Date(birthdate);
  const e = new Date(eventDate);
  if (isNaN(b.getTime()) || isNaN(e.getTime())) return '';
  const totalDays = Math.floor((e.getTime() - b.getTime()) / 86_400_000);
  if (totalDays < 0) return '';
  // birthday in the event year
  const bYear = new Date(e.getFullYear(), b.getMonth(), b.getDate());
  let years = e.getFullYear() - b.getFullYear();
  if (e < bYear) years--;
  const bYearActual = new Date(b.getFullYear() + years, b.getMonth(), b.getDate());
  const remDays = Math.floor((e.getTime() - bYearActual.getTime()) / 86_400_000);
  return `${years}y ${remDays}d`;
}

/* ── greedy lane layout ────────────────────────────────────────── */
// Milestones are always rendered in the top margin area (never over the chart).
// We only need to assign non-overlapping horizontal levels (rows).
const CALLOUT_ROW_H = 54;  // px per row (boxH=40 + gap=14)
const CALLOUT_TOP   = 4;  // y offset of first row inside the SVG

function computeLayout(
  milestones: { iso: string; threshold: number }[],
  dataLen: number,
  dataDates: string[],
): Map<string, { level: number }> {
  const LEFT_PAD = 70, PLOT_W = 680;
  const BOX_W = 120, MARGIN = 8;

  const placed: { xL: number; xR: number; level: number }[] = [];
  const result = new Map<string, { level: number }>();

  for (const ms of milestones) {
    const di = dataDates.indexOf(ms.iso);
    const cx = dataLen > 1 ? LEFT_PAD + (di / (dataLen - 1)) * PLOT_W : LEFT_PAD + PLOT_W / 2;
    const xL = cx - BOX_W / 2 - MARGIN;
    const xR = cx + BOX_W / 2 + MARGIN;

    let level = 0;
    while (placed.some(p => p.level === level && !(xR < p.xL || xL > p.xR))) level++;
    placed.push({ xL, xR, level });
    result.set(ms.iso, { level });
  }
  return result;
}

/* ── speech-bubble callout dot ────────────────────────────────── */
// Callouts are ALWAYS placed in the top margin area (above the plot).
// A dashed stem line connects the callout arrow to the dot on the chart.
// NOTE: passed as a React element (`dot={<MilestoneDot milestoneMap={...} />}`) so
// Recharts uses React.cloneElement internally — each clone receives the key from
// its loop index, eliminating the "missing key" console warning.
type MilestoneMapType = Map<string, { label: string; color: string; age: string; level: number }>;
function MilestoneDot(props: any): React.ReactElement<SVGElement> {
    const { cx, cy, payload, milestoneMap } = props as { cx?: number; cy?: number; payload?: any; milestoneMap?: MilestoneMapType };
    if (cx == null || cy == null) return <g />;
    const milestone = milestoneMap?.get(payload?.iso);

    const baseDot = (
      <circle cx={cx} cy={cy} r={milestone ? 4.5 : 1.2}
        fill={milestone ? milestone.color : '#ffffff'}
        stroke={milestone ? milestone.color : '#a855f7'}
        strokeWidth={milestone ? 2 : 0.5}
      />
    );

    if (!milestone) return baseDot;

    const { label, color, age, level } = milestone;
    const line1 = `1st ${label}`;
    const line2 = age;
    const charW = 7.5;
    const boxW = Math.max(100, Math.max(line1.length, line2.length) * charW + 18);
    const boxH = 40;
    const arrowH = 8;

    // Always in top margin: level 0 starts at CALLOUT_TOP
    const boxTop = CALLOUT_TOP + level * CALLOUT_ROW_H;
    const arrowTipY = boxTop + boxH + arrowH;
    const bx = cx - boxW / 2;

    return (
      <g key={payload.iso}>
        {/* dashed stem from arrowTip down to the actual dot */}
        <line x1={cx} y1={arrowTipY} x2={cx} y2={cy - 5}
          stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
        {/* glow ring on dot */}
        <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.15} />
        {/* callout box */}
        <rect x={bx} y={boxTop} width={boxW} height={boxH}
          rx={6} fill="#0d1f38" stroke={color} strokeWidth={1.4} opacity={0.97} />
        {/* arrow fill */}
        <path d={`M ${cx - 7} ${boxTop + boxH} L ${cx + 7} ${boxTop + boxH} L ${cx} ${boxTop + boxH + arrowH} Z`}
          fill="#0d1f38" />
        {/* arrow stroke */}
        <path d={`M ${cx - 7} ${boxTop + boxH} L ${cx} ${boxTop + boxH + arrowH} L ${cx + 7} ${boxTop + boxH}`}
          fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        {/* text line 1 */}
        <text x={cx} y={boxTop + 17} textAnchor="middle"
          fontSize={12} fontWeight={700} fill={color}>
          {line1}
        </text>
        {/* text line 2 – age */}
        {line2 && (
          <text x={cx} y={boxTop + 32} textAnchor="middle"
            fontSize={11} fontWeight={500} fill="#cbd5e1">
            Age {line2}
          </text>
        )}
        {baseDot}
      </g>
    );
}

export function RankHistoryTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const { label: display, rank, points } = payload[0].payload;
  return (
    <div className="bg-gray-800 text-gray-100 p-2 rounded shadow text-sm">
      <p className="font-bold">{display || label}</p>
      <p>Rank: {rank}</p>
      <p>Points: {points}</p>
    </div>
  );
}

export default function RankHistory({ playerId, birthdate, narrativeSlot }: RankHistoryProps) {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/players/rankings?id=${encodeURIComponent(playerId)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.rankings || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  /* ── milestone entries (first time rank ≤ threshold) ─────────────── */
  const milestones = useMemo(() => {
    return MILESTONES.map(({ threshold, label, color }) => {
      const entry = data.find(e => e.rank > 0 && e.rank <= threshold);
      if (!entry?.date) return null;
      const age = birthdate ? ageAt(birthdate, entry.date) : '';
      return { iso: entry.date, label, color, age, threshold };
    }).filter(Boolean) as { iso: string; label: string; color: string; age: string; threshold: number }[];
  }, [data, birthdate]);

  /* map iso → milestone + overlap-free layout slot */
  const milestoneMap = useMemo(() => {
    const dataDates = data.map(e => e.date ?? '');
    const layout = computeLayout(milestones, data.length, dataDates);
    const m = new Map<string, { label: string; color: string; age: string; level: number }>();
    milestones.forEach(ms => {
      const slot = layout.get(ms.iso) ?? { level: 0 };
      m.set(ms.iso, { ...ms, ...slot });
    });
    return m;
  }, [milestones, data]);

  // determine all years present in the data, for dropdown
  const years = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((e) => (e.date ? new Date(e.date).getFullYear() : NaN))
          .filter((y) => !isNaN(y))
      )
    ).sort((a, b) => a - b);
  }, [data]);

  // separate selectors for chart vs table data
  const [selectedYearChart, setSelectedYearChart] = useState<number | 'all'>('all');
  // whether chart should only plot end‑of‑year ranks
  const [chartEoyOnly, setChartEoyOnly] = useState<boolean>(false);
  // table defaults to most recent year if available, else all
  const [selectedYearTable, setSelectedYearTable] = useState<number | 'all'>(() => {
    return years.length ? years[years.length - 1] : 'all';
  });
  // track whether user has explicitly changed the table year selector
  const [tableYearUserSet, setTableYearUserSet] = useState(false);

  // reset selectors if their year disappears, and initialize table selector when years load
  useEffect(() => {
    if (years.length && typeof selectedYearChart === 'number' && !years.includes(selectedYearChart)) {
      setSelectedYearChart('all');
    }
    if (years.length && typeof selectedYearTable === 'number' && !years.includes(selectedYearTable)) {
      setSelectedYearTable('all');
    }
    // when the list first becomes available, default the table to the newest year (only once)
    if (years.length && selectedYearTable === 'all' && !tableYearUserSet) {
      setSelectedYearTable(years[years.length - 1]);
    }
  }, [years, selectedYearChart, selectedYearTable, tableYearUserSet]);

  // filtered data for chart and table separately
  const filteredChart = data.filter((e) => {
    if (!e.date) return false;
    if (selectedYearChart === 'all') return true;
    const y = new Date(e.date).getFullYear();
    return y === selectedYearChart;
  });
  const filteredTable = data.filter((e) => {
    if (!e.date) return false;
    if (selectedYearTable === 'all') return true;
    const y = new Date(e.date).getFullYear();
    return y === selectedYearTable;
  });


  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data.length)
    return (
      <div className="text-center py-8 text-gray-300">
        No ranking history available.
      </div>
    );

  // Build chart data from filteredChart; optionally reduce to last ranking per year if eoy-only
  const chartData = (() => {
    let arr = filteredChart.map((e) => ({
      iso: e.date || '',
      label: e.date ? new Date(e.date).toLocaleDateString() : '',
      rank: e.rank,
      points: e.points,
    }));
    if (chartEoyOnly) {
      const byYear: Record<number, typeof arr[0]> = {};
      arr.forEach((item) => {
        const y = new Date(item.iso).getFullYear();
        // keep the item with greatest iso (latest) for that year
        if (!byYear[y] || item.iso > byYear[y].iso) byYear[y] = item;
      });
      arr = Object.values(byYear).sort((a,b)=>a.iso.localeCompare(b.iso));
    }
    return arr;
  })();

  // compute ticks from chartData: one iso date per year
  const yearTicks: string[] = [];
  const seenY = new Set<number>();
  chartData.forEach((d) => {
    const y = d.iso ? new Date(d.iso).getFullYear() : NaN;
    if (!isNaN(y) && !seenY.has(y)) {
      seenY.add(y);
      yearTicks.push(d.iso);
    }
  });

  // Determine y-axis domain: rank numbers (lower is better)
  const ranks = data.map((e) => e.rank);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);


  function yearSelector(target: 'chart' | 'table') {
    const val = target === 'chart' ? selectedYearChart : selectedYearTable;
    const setter = target === 'chart' ? setSelectedYearChart : setSelectedYearTable;
    return (
      <div className="mb-4 flex items-center gap-4">
        <label className="text-gray-300 mr-2" htmlFor={`year-select-${target}`}>
          Year:
        </label>
        <select
          id={`year-select-${target}`}
          className="bg-gray-800 text-gray-200 rounded px-2 py-1"
          value={val}
          onChange={(e) => {
            const v = e.target.value;
            setter(v === 'all' ? 'all' : Number(v));
            if (target === 'table') setTableYearUserSet(true);
          }}
        >
          <option key="all" value="all">All</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {target === 'chart' && (
          <label className="text-gray-300 flex items-center gap-1">
            <input
              type="checkbox"
              checked={chartEoyOnly}
              onChange={(e) => setChartEoyOnly(e.target.checked)}
              className="form-checkbox h-4 w-4 text-yellow-400"
            />
            End‑of‑year only
          </label>
        )}
      </div>
    );
  }


  return (
    <>
      {/* Consistency score card */}
      <ConsistencyScore data={data} className="mb-6" />

      {/* year selector above chart, left-aligned */}
      <h2 className="text-xl font-semibold mb-2 text-center w-full">ATP Ranking week-by-week</h2>
      {yearSelector('chart')}

      <div className="mb-6 h-[56rem] rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 240, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#374151" strokeDasharray="5 5" />
            <XAxis
              dataKey="iso"
              ticks={yearTicks}
              stroke="#94a3b8"
              tick={{ fill: '#e2e8f0', fontSize: 16 }}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
              tickFormatter={(value: string) => {
                try {
                  const d = new Date(value);
                  if (!isNaN(d.getTime())) return String(d.getFullYear());
                } catch {}
                return value;
              }}
            />
            <YAxis
              data-testid="yaxis"
              stroke="#94a3b8"
              tick={{ fill: '#e2e8f0', fontSize: 16 }}
              tickLine={false}
              axisLine={false}
              domain={[Math.max(1, minRank), maxRank]}
              reversed={true}
              allowDataOverflow={false}
              scale="log"
              label={{ value: 'Rank', angle: -90, position: 'insideLeft', style: { fill: '#c4b5fd', fontWeight: 'bold' } }}
            />
            <Tooltip
              content={<RankHistoryTooltip />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#8b5cf6"
              strokeWidth={0.5}
              dot={<MilestoneDot milestoneMap={milestoneMap} />}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* End-of-year ranking table (Wikipedia-style) */}
      <EndOfYearRanks data={data} className="mb-6" />

      {/* Weekly momentum bar chart */}
      <div className="mb-6">
        <WeeklyMomentum data={data} selectedYear={selectedYearChart} />
      </div>

      {/* Career stats, weeks and milestones tables side-by-side */}
      {narrativeSlot && <div className="mb-8">{narrativeSlot}</div>}
      <h2 className="text-xl font-semibold mb-4 text-center w-full">ATP Ranking Milestones</h2>
      <div className="mb-6 flex flex-wrap gap-6">
        <div className="flex-1 min-w-[300px]">
          <RankingStatsTable data={data} />
        </div>
        <div className="flex-1 min-w-[300px]">
          <RankingWeeksTable data={data} />
        </div>
        <div className="flex-1 min-w-[300px]">
          <RankingMilestonesTable data={data} birthdate={birthdate} />
        </div>
      </div>

      {/* year selector above table; controls only table */}
      {yearSelector('table')}

      {/* complete ranking table header */}
      <h2 className="text-xl font-semibold mb-2 text-center w-full">All ATP Rankings</h2>

      <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th className="border border-white/30 px-4 py-2 text-center text-base text-gray-200 font-semibold">
                Date
              </th>
              <th className="border border-white/30 px-4 py-2 text-center text-base text-gray-200 font-semibold">
                Rank
              </th>
              <th className="border border-white/30 px-4 py-2 text-center text-base text-gray-200 font-semibold">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTable.map((e, idx) => (
              <tr key={idx} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-base text-gray-200">
                  {e.date ? new Date(e.date).toLocaleDateString() : "-"}
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-base text-gray-200">
                  {e.rank}
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-base text-gray-200">
                  {e.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
