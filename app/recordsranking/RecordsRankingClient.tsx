import React from 'react';
import Link from 'next/link';

interface RecordsRankingProps {
  currentTabSeg?: string | null;
  currentSubSeg?: string | null;
}

// Server-rendered tab UI — main tabs + persistent sub-tab row (no hover required, works on mobile)
export default function RecordsRankingClient({ currentTabSeg = 'weeksatno', currentSubSeg = null }: RecordsRankingProps) {
  const tabPathMap: Record<string, string> = {
    Count: 'weeksatno',
    Top: 'weeksattop',
    EndSeason: 'endoftheseason',
    AgesEndofTheSeason: 'agesendoftheseason',
    TimespanEndOfTheSeason: 'timespanendoftheseason',
    MostPoints: 'mostpoints',
    DiffPoints: 'diffpoints',
  };

  const tabs = [
    { key: 'Count', label: 'Weeks at Rank' },
    { key: 'Top', label: 'Weeks in Top N' },
    { key: 'Streak', label: 'Streak', hasSub: true },
    { key: 'EndSeason', label: 'Year-End', hasSub: true },
    { key: 'Ages', label: 'Ages Overall', hasSub: true },
    { key: 'AgesEndofTheSeason', label: 'Ages Year-End', hasSub: true },
    { key: 'Timespan', label: 'Timespan Overall', hasSub: true },
    { key: 'TimespanEndOfTheSeason', label: 'Timespan Year-End', hasSub: true },
    { key: 'MostPoints', label: 'Most Points', hasSub: true },
    { key: 'DiffPoints', label: 'Points Gap No.1 vs No.2', hasSub: true },
  ];

  const subTabsOptions: Record<string, { key: string; label: string }[]> = {
    Streak: [{ key: 'consecutiveweeksatno', label: 'By Rank' }, { key: 'consecutiveweeksattop', label: 'By Top N' }],
    EndSeason: [{ key: 'no', label: 'By Rank' }, { key: 'attop', label: 'By Top N' }, { key: 'consecutivesatno', label: 'Streak (Rank)' }, { key: 'consecutivesattop', label: 'Streak (Top N)' }],
    Ages: [{ key: 'youngestsatno', label: 'Youngest at No.' }, { key: 'oldestsatno', label: 'Oldest at No.' }, { key: 'youngestattop', label: 'Youngest at Top' }, { key: 'oldestattop', label: 'Oldest at Top' }],
    AgesEndofTheSeason: [{ key: 'youngestsatno', label: 'Youngest at No. (EOY)' }, { key: 'oldestsatno', label: 'Oldest at No. (EOY)' }, { key: 'youngestattop', label: 'Youngest at Top (EOY)' }, { key: 'oldestattop', label: 'Oldest at Top (EOY)' }],
    Timespan: [{ key: 'atno', label: 'By Rank' }, { key: 'attop', label: 'By Top N' }],
    TimespanEndOfTheSeason: [{ key: 'atno', label: 'By Rank' }, { key: 'attop', label: 'By Top N' }],
    MostPoints: [{ key: 'overall', label: 'Overall' }, { key: 'endoftheseason', label: 'Year-End' }],
    DiffPoints: [{ key: 'overall', label: 'Overall' }, { key: 'endoftheseason', label: 'Year-End' }],
  };

  // Default numeric value for each route (appended to links so URLs always include the number)
  const numericDefaults: Record<string, number> = {
    'weeksatno': 1, 'weeksattop': 2,
    'streak/consecutiveweeksatno': 1, 'streak/consecutiveweeksattop': 2,
    'endoftheseason/no': 1, 'endoftheseason/attop': 2,
    'endoftheseason/consecutivesatno': 1, 'endoftheseason/consecutivesattop': 2,
    'ages/youngestsatno': 1, 'ages/oldestsatno': 1,
    'ages/youngestattop': 2, 'ages/oldestattop': 2,
    'agesendoftheseason/youngestsatno': 1, 'agesendoftheseason/oldestsatno': 1,
    'agesendoftheseason/youngestattop': 2, 'agesendoftheseason/oldestattop': 2,
    'timespan/atno': 1, 'timespan/attop': 2,
    'timespanendoftheseason/atno': 1, 'timespanendoftheseason/attop': 2,
  };

  const withDefault = (path: string) => {
    const key = path.replace('/recordsranking/', '');
    const def = numericDefaults[key];
    return def !== undefined ? `${path}/${def}` : path;
  };

  const normalizeSeg = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const activeTabKey = (() => {
    if (currentTabSeg === null || currentTabSeg === undefined) return null;
    const normCurrent = normalizeSeg(currentTabSeg);
    const reverseMap = Object.fromEntries(Object.entries(tabPathMap).map(([k,v]) => [normalizeSeg(v), k]));
    const found = Object.values(tabPathMap).map(v => normalizeSeg(v)).includes(normCurrent) ? reverseMap[normCurrent] : undefined;
    if (found) return found;
    const foundTab = tabs.find(t => normalizeSeg(tabPathMap[t.key] ?? t.key) === normCurrent);
    return foundTab?.key ?? 'Count';
  })();

  const activeSubTabs = activeTabKey ? (subTabsOptions[activeTabKey] ?? []) : [];
  const activeTabSeg = activeTabKey ? (tabPathMap[activeTabKey] ?? activeTabKey).toLowerCase() : '';

  return (
    <div className="w-full px-4 sm:px-8 py-6 text-white bg-gray-900">
      {/* Main tab bar */}
      <nav className="mb-4 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-3 shadow-lg w-full justify-center" aria-label="Ranking tabs">
        {tabs.map((tab) => {
          const tabSeg = ((tabPathMap as any)[tab.key] ?? tab.key).toLowerCase();
          const href = `/recordsranking/${tabSeg}`;
          const firstSub = (subTabsOptions as any)[tab.key]?.[0]?.key;
          const rawLinkHref = tab.hasSub && firstSub ? `${href}/${encodeURIComponent(firstSub)}` : href;
          const linkHref = withDefault(rawLinkHref);
          const isActive = activeTabKey !== null && activeTabKey === tab.key;

          return (
            <div key={tab.key} className="relative group inline-block">
              <Link
                href={linkHref}
                aria-haspopup={tab.hasSub ? 'menu' : undefined}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              >
                {tab.label}
              </Link>

              {tab.hasSub && (
                <div role="menu" className="absolute left-0 top-full mt-2 flex flex-col gap-2 opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity duration-150 z-10 bg-gray-800 rounded px-2 py-2 min-w-[12rem]">
                  {(subTabsOptions[tab.key] || []).map(st => {
                    const subHref = withDefault(`${href}/${encodeURIComponent(st.key)}`);
                    const isSubActive = currentSubSeg != null && normalizeSeg(currentSubSeg) === normalizeSeg(st.key);
                    return (
                      <Link
                        key={st.key}
                        href={subHref}
                        role="menuitem"
                        className={`px-2 py-1 rounded text-sm ${isSubActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                      >
                        {st.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
