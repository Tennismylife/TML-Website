"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';

type SubTab = { key: string; label: string; segment: string };

type MainTab = {
  key: string;
  label: string;
  segment: string;
  subTabs?: SubTab[];
};

const tabs: MainTab[] = [
  { key: 'Count', label: 'No.', segment: 'count' },
  { key: 'Top', label: 'Top', segment: 'top' },
  {
    key: 'Streak',
    label: 'Streak',
    segment: 'streak',
    subTabs: [
      { key: 'Count', label: 'Count', segment: 'count' },
      { key: 'Top', label: 'Top', segment: 'top' },
    ],
  },
  {
    key: 'EndSeason',
    label: 'End of the Season',
    segment: 'endoftheseason',
    subTabs: [
      { key: 'Count', label: 'Count', segment: 'count' },
      { key: 'Top', label: 'Top', segment: 'top' },
      { key: 'StreakCount', label: 'Streak Count', segment: 'streakcount' },
      { key: 'StreakTop', label: 'Streak Top', segment: 'streaktop' },
    ],
  },
  {
    key: 'Ages',
    label: 'Ages Overall',
    segment: 'ages',
    subTabs: [
      { key: 'YoungestCount', label: 'Youngest at No.', segment: 'youngestcount' },
      { key: 'OldestCount', label: 'Oldest at No.', segment: 'oldestcount' },
      { key: 'YoungestTop', label: 'Youngest at Top', segment: 'youngesttop' },
      { key: 'OldestTop', label: 'Oldest at Top', segment: 'oldesttop' },
    ],
  },
  {
    key: 'AgesEndofTheSeason',
    label: 'Ages End of the Season',
    segment: 'agesendoftheseason',
    subTabs: [
      {
        key: 'YoungestCount',
        label: 'Youngest at No. in the End of the Season',
        segment: 'youngestcount',
      },
      {
        key: 'OldestCount',
        label: 'Oldest at No. in the End of the Season',
        segment: 'oldestcount',
      },
      {
        key: 'YoungestTop',
        label: 'Youngest at Top in the End of the Season',
        segment: 'youngesttop',
      },
      {
        key: 'OldestTop',
        label: 'Oldest at Top in the End of the Season',
        segment: 'oldesttop',
      },
    ],
  },
  {
    key: 'Timespan',
    label: 'Timespan Overall',
    segment: 'timespan',
    subTabs: [
      { key: 'Count', label: 'Count', segment: 'count' },
      { key: 'Top', label: 'Top', segment: 'top' },
    ],
  },
  {
    key: 'TimespanEndOfTheSeason',
    label: 'Timespan End of the Season',
    segment: 'timespanendoftheseason',
    subTabs: [
      { key: 'Count', label: 'Count', segment: 'count' },
      { key: 'Top', label: 'Top', segment: 'top' },
    ],
  },
  {
    key: 'MostPoints',
    label: 'Most Points',
    segment: 'mostpoints',
    subTabs: [
      { key: 'Overall', label: 'Overall', segment: 'overall' },
      { key: 'EndOfTheSeason', label: 'EndOfTheSeason', segment: 'endoftheseason' },
    ],
  },
  {
    key: 'DiffPoints',
    label: 'Diff Points',
    segment: 'diffpoints',
    subTabs: [
      { key: 'Overall', label: 'Overall', segment: 'overall' },
      { key: 'EndOfTheSeason', label: 'EndOfTheSeason', segment: 'endoftheseason' },
    ],
  },
];

function getActiveFromPathname(pathname: string | null) {
  const parts = (pathname ?? '').split('/').filter(Boolean);
  const idx = parts.indexOf('recordsranking');
  const seg1 = idx >= 0 ? parts[idx + 1] ?? null : null;
  const seg2 = idx >= 0 ? parts[idx + 2] ?? null : null;

  const main = seg1 ? decodeURIComponent(seg1) : null;
  const sub = seg2 ? decodeURIComponent(seg2) : null;

  let activeMainKey: string | null = null;
  let activeSubKey: string | null = null;

  for (const t of tabs) {
    if (t.segment === main) {
      activeMainKey = t.key;
      if (t.subTabs && sub) {
        const st = t.subTabs.find(x => x.segment === sub);
        activeSubKey = st?.key ?? null;
      }
      break;
    }
    // main tabs without subtabs (Count/Top) match via segment too (handled above)
  }

  // Default when on /recordsRanking
  if (!activeMainKey) activeMainKey = 'Count';

  const activeMain = tabs.find(t => t.key === activeMainKey) ?? tabs[0];
  const activeSub = activeMain.subTabs
    ? activeMain.subTabs.find(st => st.key === activeSubKey)?.key ?? activeMain.subTabs[0]?.key ?? null
    : null;

  return { activeMain, activeSubKey: activeSub };
}

export default function RecordsRankingTabs() {
  const pathname = usePathname();
  const { activeMain, activeSubKey } = getActiveFromPathname(pathname);
  const [hovered, setHovered] = useState<string | null>(null);

  const tabHref = (t: MainTab) => {
    if (t.subTabs && t.subTabs.length > 0) {
      const first = t.subTabs[0];
      return `/recordsranking/${encodeURIComponent(t.segment)}/${encodeURIComponent(first.segment)}`;
    }
    return `/recordsranking/${encodeURIComponent(t.segment)}`;
  };

  const tabClass = (isActive: boolean) =>
    `relative inline-flex items-center h-10 px-4 py-2 rounded-2xl font-medium transition-colors duration-200 ${
      isActive ? 'text-white' : 'text-gray-300 hover:text-white'
    }`;

  const subClass = (isActive: boolean) =>
    `inline-flex items-center h-9 px-3 py-2 rounded-xl text-left text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 ${
      isActive ? 'bg-gray-700 text-white' : ''
    }`;

  return (
    <div className="mb-8">
      <div className="relative flex flex-wrap gap-3 bg-gray-800/40 rounded-2xl p-4 shadow-lg w-full justify-center">
        {tabs.map(t => {
          const isActive = activeMain.key === t.key;
          return (
            <div
              key={t.key}
              className="relative"
              onMouseEnter={() => t.subTabs && setHovered(t.key)}
              onMouseLeave={() => t.subTabs && setHovered(null)}
            >
              {t.subTabs && t.subTabs.length > 0 ? (
                <button
                  onClick={() => setHovered(prev => (prev === t.key ? null : t.key))}
                  className={tabClass(isActive)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-records-ranking-tab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              ) : (
                <Link key={t.key} href={tabHref(t)} className={tabClass(isActive)}>
                  {isActive && (
                    <motion.div
                      layoutId="active-records-ranking-tab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </Link>
              )}

              {t.subTabs && (hovered === t.key || isActive) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="absolute left-0 top-full mt-2 bg-gray-800 rounded-2xl p-2 shadow-lg min-w-max z-20 flex flex-col gap-1"
                >
                  {t.subTabs.map(st => {
                    const isSubActive = activeMain.key === t.key && activeSubKey === st.key;
                    const href = `/recordsRanking/${encodeURIComponent(t.segment)}/${encodeURIComponent(st.segment)}`;
                    return (
                      <Link key={st.key} href={href} className={subClass(isSubActive)}>
                        {st.label}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
