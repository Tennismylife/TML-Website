import React from 'react';
import Link from 'next/link';

interface RecordsRankingProps {
  currentTabSeg?: string | null;
  currentSubSeg?: string | null;
}

// Server-rendered tab UI (no client hooks) — simple link-based tabs and inline sub-links
export default function RecordsRankingClient({ currentTabSeg = 'count', currentSubSeg = null }: RecordsRankingProps) {
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

  const normalizeSeg = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const activeTabKey = (() => {
    if (!currentTabSeg) return 'Count';
    const normCurrent = normalizeSeg(currentTabSeg);
    const reverseMap = Object.fromEntries(Object.entries(tabPathMap).map(([k,v]) => [normalizeSeg(v), k]));
    const found = Object.values(tabPathMap).includes(normCurrent) ? reverseMap[normCurrent] : undefined;
    if (found) return found;
    const foundTab = tabs.find(t => normalizeSeg(tabPathMap[t.key] ?? t.key) === normCurrent);
    return foundTab?.key ?? 'Count';
  })();

  return (
    <main className="w-full px-8 py-8 text-white bg-gray-900">
      <nav className="mb-4 flex flex-wrap gap-3 bg-gray-800/40 rounded-2xl p-4 shadow-lg w-full justify-center" aria-label="Ranking tabs">
        {tabs.map((tab) => {
          const tabSeg = (tabPathMap as any)[tab.key] ?? tab.key;
          const href = `/recordsranking/${tabSeg.replace(/([A-Z])/g,(m)=>m.toLowerCase())}`;
          const firstSub = (subTabsOptions as any)[tab.key]?.[0]?.key;
          const linkHref = tab.hasSub && firstSub ? `${href}/${encodeURIComponent(firstSub)}` : href;
          const isActive = activeTabKey === tab.key;

          return (
            <div key={tab.key} className="relative">
              <Link
                href={linkHref}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              >
                {tab.label}
              </Link>

              {tab.hasSub && (
                <div className="mt-2 flex gap-2">
                  {(subTabsOptions[tab.key] || []).map(st => {
                    const subHref = `${href}/${encodeURIComponent(st.key)}`;
                    const isSubActive = currentSubSeg && currentSubSeg.toLowerCase() === st.key.toLowerCase();
                    return (
                      <Link
                        key={st.key}
                        href={subHref}
                        className={`px-2 py-1 rounded text-sm ${isSubActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
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

      <div id="recordsranking-server-content" className="mt-6 w-full overflow-x-auto" />
    </main>
  );
}
