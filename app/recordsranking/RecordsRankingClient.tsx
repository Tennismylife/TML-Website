import React from 'react';
import Link from 'next/link';


interface RecordsRankingProps {
  currentTabSeg?: string | null;
  currentSubSeg?: string | null;
}

// server-only simplified tab UI: renders link-based tabs (no client JS)
export default function RecordsRankingClient({ currentTabSeg = 'count', currentSubSeg = null }: RecordsRankingProps) {
  // mapping similar to previous implementation
  const tabPathMap: Record<string, string> = {
    EndSeason: 'endoftheseason',
    AgesEndofTheSeason: 'agesendoftheseason',
    TimespanEndOfTheSeason: 'timespanendoftheseason',
    MostPoints: 'mostpoints',
    DiffPoints: 'diffpoints',
  };

  const tabs = [
    { key: 'Count', label: 'No.' },
    { key: 'Top', label: 'Top' },
    { key: 'Streak', label: 'Streak', hasSub: true },
    { key: 'EndSeason', label: 'End of the Season', hasSub: true },
    { key: 'Ages', label: 'Ages Overall', hasSub: true },
    { key: 'AgesEndofTheSeason', label: 'Ages End of the Season', hasSub: true },
    { key: 'Timespan', label: 'Timespan Overall', hasSub: true },
    { key: 'TimespanEndOfTheSeason', label: 'Timespan End of the Season', hasSub: true },
    { key: 'MostPoints', label: 'Most Points', hasSub: true },
    { key: 'DiffPoints', label: 'Diff Points', hasSub: true },
  ];

  const subTabsOptions: Record<string, { key: string; label: string }[]> = {
    Streak: [{ key: 'count', label: 'Count' }, { key: 'top', label: 'Top' }],
    EndSeason: [{ key: 'count', label: 'Count' }, { key: 'top', label: 'Top' }, { key: 'streakcount', label: 'Streak Count' }, { key: 'streaktop', label: 'Streak Top' }],
    Ages: [{ key: 'youngestcount', label: 'Youngest at No.' }, { key: 'oldestcount', label: 'Oldest at No.' }, { key: 'youngesttop', label: 'Youngest at Top' }, { key: 'oldesttop', label: 'Oldest at Top' }],
    AgesEndofTheSeason: [{ key: 'youngestcount', label: 'Youngest at No. (EOY)' }, { key: 'oldestcount', label: 'Oldest at No. (EOY)' }, { key: 'youngesttop', label: 'Youngest at Top (EOY)' }, { key: 'oldesttop', label: 'Oldest at Top (EOY)' }],
    Timespan: [{ key: 'count', label: 'Count' }, { key: 'top', label: 'Top' }],
    TimespanEndOfTheSeason: [{ key: 'count', label: 'Count' }, { key: 'top', label: 'Top' }],
    MostPoints: [{ key: 'overall', label: 'Overall' }, { key: 'endoftheseason', label: 'EndOfTheSeason' }],
    DiffPoints: [{ key: 'overall', label: 'Overall' }, { key: 'endoftheseason', label: 'EndOfTheSeason' }],
  };

  const keyToPath = (k: string) => (Object.fromEntries(Object.entries(tabPathMap).map(([a,b]) => [a,b])[k] ?? k).replace ? (tabPathMap[k] ?? k).replace(/([A-Z])/g, (m) => m.toLowerCase()) : (tabPathMap[k] ?? k).replace(/([A-Z])/g, (m) => m.toLowerCase()));

  const activeTabKey = (() => {
    if (!currentTabSeg) return 'Count';
    const reverseMap = Object.fromEntries(Object.entries(tabPathMap).map(([k,v]) => [v, k]));
    if (reverseMap[currentTabSeg]) return reverseMap[currentTabSeg];
    const found = tabs.find(t => (tabPathMap[t.key] ?? t.key).toLowerCase() === currentTabSeg.toLowerCase());
    return found?.key ?? 'Count';
  })();

  return (
    <main className="w-full px-8 py-8 text-white bg-gray-900">
      <h1 className="mb-8 text-3xl font-bold text-center text-gray-100">Records Ranking</h1>

      <div className="mb-4 flex flex-wrap gap-3 bg-gray-800/40 rounded-2xl p-4 shadow-lg w-full justify-center">
        {tabs.map((tab) => {
          const tabSeg = (tabPathMap as any)[tab.key] ?? tab.key;
          const href = `/recordsranking/${tabSeg.replace(/([A-Z])/g,(m)=>m.toLowerCase())}`;
          const isActive = activeTabKey === tab.key;
          return (
            <div key={tab.key} className="relative group">
              <Link href={href} className={`relative px-4 py-2 rounded-2xl font-medium ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <span>{tab.label}</span>
              </Link>
              {tab.hasSub && (
                <div className="absolute left-0 mt-2 hidden group-hover:flex flex-col gap-1 bg-gray-900 p-2 rounded-lg shadow-lg z-10">
                  {(subTabsOptions[tab.key] || []).map(st => {
                    const subHref = `${href}/${encodeURIComponent(st.key)}`;
                    const isSubActive = currentSubSeg && currentSubSeg.toLowerCase() === st.key.toLowerCase();
                    return (
                      <Link
                        key={st.key}
                        href={subHref}
                        className={`px-3 py-1 rounded transition-colors duration-150 ${isSubActive ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white'}`}>
                        {st.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div id="recordsranking-server-content" className="mt-6 w-full overflow-x-auto" />
    </main>
  );
}
