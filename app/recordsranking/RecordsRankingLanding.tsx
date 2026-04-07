'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';

const RANK_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TOP_VALUES  = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 100];

type RecordEntry = { title: string; href: string; category: string };

function buildRecords(): RecordEntry[] {
  const out: RecordEntry[] = [];
  for (const n of RANK_VALUES)
    out.push({ title: `Most Weeks at ATP No. ${n}`, href: `/recordsranking/weeksatno/${n}`, category: 'Weeks at Rank' });
  for (const n of TOP_VALUES)
    out.push({ title: `Most Weeks in ATP Top ${n}`, href: `/recordsranking/weeksattop/${n}`, category: 'Weeks in Top N' });
  for (const n of RANK_VALUES)
    out.push({ title: `Most Consecutive Weeks at ATP No. ${n}`, href: `/recordsranking/streak/consecutiveweeksatno/${n}`, category: 'Consecutive Weeks at Rank' });
  for (const n of TOP_VALUES)
    out.push({ title: `Most Consecutive Weeks in ATP Top ${n}`, href: `/recordsranking/streak/consecutiveweeksattop/${n}`, category: 'Consecutive Weeks in Top N' });
  for (const n of RANK_VALUES)
    out.push({ title: `Most Year-End Finishes at ATP No. ${n}`, href: `/recordsranking/endoftheseason/no/${n}`, category: 'Year-End Finishes at Rank' });
  for (const n of TOP_VALUES)
    out.push({ title: `Most Year-End Finishes in ATP Top ${n}`, href: `/recordsranking/endoftheseason/attop/${n}`, category: 'Year-End Finishes in Top N' });
  for (const n of RANK_VALUES)
    out.push({ title: `Most Consecutive Year-End Finishes at ATP No. ${n}`, href: `/recordsranking/endoftheseason/consecutivesatno/${n}`, category: 'Consecutive Year-End Finishes at Rank' });
  for (const n of TOP_VALUES)
    out.push({ title: `Most Consecutive Year-End Finishes in ATP Top ${n}`, href: `/recordsranking/endoftheseason/consecutivesattop/${n}`, category: 'Consecutive Year-End Finishes in Top N' });
  for (const n of RANK_VALUES)
    out.push({ title: `Youngest Player to Reach ATP No. ${n}`, href: `/recordsranking/ages/youngestsatno/${n}`, category: 'Ages — Overall' });
  for (const n of RANK_VALUES)
    out.push({ title: `Oldest Player to Reach ATP No. ${n}`, href: `/recordsranking/ages/oldestsatno/${n}`, category: 'Ages — Overall' });
  for (const n of TOP_VALUES)
    out.push({ title: `Youngest Player in ATP Top ${n}`, href: `/recordsranking/ages/youngestattop/${n}`, category: 'Ages — Overall' });
  for (const n of TOP_VALUES)
    out.push({ title: `Oldest Player in ATP Top ${n}`, href: `/recordsranking/ages/oldestattop/${n}`, category: 'Ages — Overall' });
  for (const n of RANK_VALUES)
    out.push({ title: `Youngest Player at Year-End ATP No. ${n}`, href: `/recordsranking/agesendoftheseason/youngestsatno/${n}`, category: 'Ages — Year-End' });
  for (const n of RANK_VALUES)
    out.push({ title: `Oldest Player at Year-End ATP No. ${n}`, href: `/recordsranking/agesendoftheseason/oldestsatno/${n}`, category: 'Ages — Year-End' });
  for (const n of TOP_VALUES)
    out.push({ title: `Youngest Player to Finish Year in ATP Top ${n}`, href: `/recordsranking/agesendoftheseason/youngestattop/${n}`, category: 'Ages — Year-End' });
  for (const n of TOP_VALUES)
    out.push({ title: `Oldest Player to Finish Year in ATP Top ${n}`, href: `/recordsranking/agesendoftheseason/oldestattop/${n}`, category: 'Ages — Year-End' });
  for (const n of RANK_VALUES)
    out.push({ title: `Career Timespan at ATP No. ${n}`, href: `/recordsranking/timespan/atno/${n}`, category: 'Career Timespan — Overall' });
  for (const n of TOP_VALUES)
    out.push({ title: `Career Timespan in ATP Top ${n}`, href: `/recordsranking/timespan/attop/${n}`, category: 'Career Timespan — Overall' });
  for (const n of RANK_VALUES)
    out.push({ title: `Year-End Career Timespan at ATP No. ${n}`, href: `/recordsranking/timespanendoftheseason/atno/${n}`, category: 'Career Timespan — Year-End' });
  for (const n of TOP_VALUES)
    out.push({ title: `Year-End Career Timespan in ATP Top ${n}`, href: `/recordsranking/timespanendoftheseason/attop/${n}`, category: 'Career Timespan — Year-End' });
  out.push({ title: 'Most ATP Ranking Points', href: '/recordsranking/mostpoints/overall', category: 'Points Records' });
  out.push({ title: 'Most ATP Ranking Points (Year-End)', href: '/recordsranking/mostpoints/endoftheseason', category: 'Points Records' });
  out.push({ title: 'Largest Points Gap No. 1 vs No. 2', href: '/recordsranking/diffpoints/overall', category: 'Points Records' });
  out.push({ title: 'Largest Year-End Points Gap No. 1 vs No. 2', href: '/recordsranking/diffpoints/endoftheseason', category: 'Points Records' });
  return out;
}

const ALL_RECORDS = buildRecords();

type CategoryMeta = { icon: string; color: string; bg: string; border: string; dot: string };

const CATEGORIES: { label: string; meta: CategoryMeta }[] = [
  { label: 'Weeks at Rank',                          meta: { icon: '🏆', color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    } },
  { label: 'Weeks in Top N',                         meta: { icon: '📊', color: 'text-blue-200',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30',    dot: 'bg-blue-300'    } },
  { label: 'Consecutive Weeks at Rank',              meta: { icon: '🔥', color: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-400'  } },
  { label: 'Consecutive Weeks in Top N',             meta: { icon: '⚡', color: 'text-purple-200',  bg: 'bg-purple-400/10',  border: 'border-purple-400/30',  dot: 'bg-purple-300'  } },
  { label: 'Year-End Finishes at Rank',              meta: { icon: '🎯', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' } },
  { label: 'Year-End Finishes in Top N',             meta: { icon: '🏅', color: 'text-emerald-200', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', dot: 'bg-emerald-300' } },
  { label: 'Consecutive Year-End Finishes at Rank',  meta: { icon: '📅', color: 'text-teal-300',    bg: 'bg-teal-500/10',    border: 'border-teal-500/30',    dot: 'bg-teal-400'    } },
  { label: 'Consecutive Year-End Finishes in Top N', meta: { icon: '🗓️', color: 'text-teal-200',    bg: 'bg-teal-400/10',    border: 'border-teal-400/30',    dot: 'bg-teal-300'    } },
  { label: 'Ages — Overall',                         meta: { icon: '🧒', color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400'   } },
  { label: 'Ages — Year-End',                        meta: { icon: '👴', color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  } },
  { label: 'Career Timespan — Overall',              meta: { icon: '⏳', color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400'    } },
  { label: 'Career Timespan — Year-End',             meta: { icon: '🕰️', color: 'text-cyan-200',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/30',    dot: 'bg-cyan-300'    } },
  { label: 'Points Records',                         meta: { icon: '💯', color: 'text-rose-300',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    dot: 'bg-rose-400'    } },
];

const META_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c.meta]));
const CATEGORY_ORDER = CATEGORIES.map(c => c.label);

export default function RecordsRankingLanding({ tabBar }: { tabBar?: React.ReactNode }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ALL_RECORDS;
    return ALL_RECORDS.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecordEntry[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const rec of filtered) map.get(rec.category)?.push(rec);
    return [...map.entries()].filter(([, recs]) => recs.length > 0);
  }, [filtered]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-gray-900 to-purple-900/30 pointer-events-none" />
        <div className="relative px-4 pt-6 pb-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {ALL_RECORDS.length} leaderboards
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
            ATP Ranking Records
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            All-time leaderboards across weeks at rank, consecutive streaks, year-end finishes, ages, career timespans and points records.
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      {tabBar && <div className="w-full">{tabBar}</div>}

      {/* Category pills (quick filters) — hidden when searching */}
      {!isSearching && (
        <div className="px-4 pb-2 max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map(({ label, meta }) => (
              <a
                key={label}
                href={`#cat-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.border} ${meta.color} hover:brightness-125 transition-all`}
              >
                <span>{meta.icon}</span>
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pb-2 max-w-xl mx-auto">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder='Search… (e.g. "consecutive", "youngest", "top 5")'
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        {isSearching && (
          <p className="mt-2 text-sm text-gray-500 text-center">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Grouped list */}
      <div className="px-4 pb-4 max-w-4xl mx-auto space-y-3">
        {grouped.length === 0 && (
          <p className="text-center text-gray-500 py-20">
            No records found for &ldquo;<span className="text-gray-300">{query}</span>&rdquo;.
          </p>
        )}

        {grouped.map(([category, records]) => {
          const meta = META_MAP[category] ?? { icon: '📋', color: 'text-gray-400', bg: 'bg-gray-700/20', border: 'border-gray-600/30', dot: 'bg-gray-400' };
          return (
            <div key={category} id={`cat-${category.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
              {/* Section header */}
              <div className={`flex items-center gap-3 px-4 py-1.5 rounded-t-xl border-t border-x ${meta.bg} ${meta.border} mb-0`}>
                <span className="text-lg">{meta.icon}</span>
                <h2 className={`text-sm font-semibold uppercase tracking-wider ${meta.color}`}>
                  {category}
                </h2>
                <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-full ${meta.bg} ${meta.border} border ${meta.color} opacity-70`}>
                  {records.length}
                </span>
              </div>

              {/* Rows */}
              <ul className={`divide-y border-x border-b rounded-b-xl overflow-hidden ${meta.border} divide-gray-800/60`}>
                {records.map(rec => (
                  <li key={rec.href}>
                    <Link
                      href={rec.href}
                      className="flex items-center gap-3 px-4 py-1.5 hover:bg-gray-800/60 transition-colors group"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot} opacity-60 group-hover:opacity-100 transition-opacity`} />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex-1">
                        {rec.title}
                      </span>
                      <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
