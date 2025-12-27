'use client';

import { useState, useEffect } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataItem {
  label: string; // e.g., '1977' or '1977-1' when multiple tournaments exist in same year
  year: number;
  averageAge: number;
}

interface AverageAgeData {
  chartData: ChartDataItem[];
  overallAverage: string;
}

export default function AverageAgeSection({ id }: { id: string }) {
  const [data, setData] = useState<AverageAgeData | null>(null);
  const [loading, setLoading] = useState(true);

  // detect mobile to reduce animations and chart height
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as MediaQueryListEvent).matches ?? (e as MediaQueryList).matches);
    setIsMobile(m.matches);
    m.addEventListener('change', handler as any);
    return () => m.removeEventListener('change', handler as any);
  }, []);

  useEffect(() => {
    fetch(`/api/tournaments/${id}/records/averageage`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(() => { /* ignore fetch error for UI */ })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data || data.chartData.length === 0) {
    return (
      <div className="h-96 rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-t-indigo-500 border-gray-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  const { chartData, overallAverage } = data;
  const ages = chartData.map((d) => d.averageAge);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);

  // Arrotondiamo per avere sempre tick interi
  const yMin = Math.floor(minAge - 1);  // es. 24.2 → 23 (per partire sotto)
  const yMax = Math.ceil(maxAge + 1);   // es. 28.7 → 30

  // Generiamo tick solo interi, ogni anno
  const yTicks = [];
  for (let i = yMin; i <= yMax; i++) {
    yTicks.push(i);
  }

  const dataCount = chartData.length;
  const xAngle = dataCount > 25 ? -60 : dataCount > 15 ? -45 : -35;
  const xHeight = dataCount > 25 ? 110 : dataCount > 15 ? 95 : 80;


  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 p-6 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <h3 className="text-2xl font-bold text-white">Average Age Over Time</h3>
          <div className="text-right">
            <p className="text-sm text-gray-400">Overall Average</p>
            <p className="text-5xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {overallAverage}
              <span className="text-xl ml-2 text-gray-300">years</span>
            </p>
          </div>
        </div>

        <div className="bg-black/40 rounded-2xl border border-gray-800 p-4 -m-6 mt-6">
          <ResponsiveContainer width="100%" height={isMobile ? 320 : 480}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <defs>
                <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#374151" strokeDasharray="5 10" opacity={0.6} />

              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                angle={xAngle}
                textAnchor="end"
                height={xHeight}
                interval={dataCount > 20 ? 0 : 'preserveStartEnd'}
              />

              {/* Asse Y con SOLO numeri interi: 24, 25, 26... */}
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#e2e8f0', fontSize: 14, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                domain={[yMin, yMax]}
                ticks={yTicks}
                tickFormatter={(value) => `${value}`} // forza intero
                label={{
                  value: 'Average Age (years)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#c4b5fd', fontWeight: 'bold' },
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid #6b7280',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                }}
                labelStyle={{ color: '#e9d5ff', fontWeight: 'bold' }}
                itemStyle={{ color: '#ddd6fe' }}
                formatter={(value: number) => `${value.toFixed(2)} years`}
                labelFormatter={(label) => `Edition ${label}`}
              />

              <Line
                type="monotone"
                dataKey="averageAge"
                stroke="url(#colorLine)"
                strokeWidth={5}
                dot={{ fill: '#c084fc', r: isMobile ? 3 : 7, stroke: '#1e1b4b', strokeWidth: isMobile ? 1 : 3 }}
                activeDot={isMobile ? false : { r: 10, stroke: '#ddd6fe', strokeWidth: 4 }}
                animationDuration={isMobile ? 0 : 1200}
                isAnimationActive={!isMobile}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}