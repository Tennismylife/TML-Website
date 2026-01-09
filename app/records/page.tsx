import React from 'react';
import { redirect } from 'next/navigation';
import RecordsTabs from './RecordsTabs';
import RecordsFilters from './RecordsFilters.server';
import RecordsFilteredServer from './RecordsFiltered.server';
import RecordsOverviewTree from './RecordsOverviewTree';
import { metadataBase } from '../../lib/site';
import { generateRecordDescription } from '../../lib/generateRecordDescription';

// Server-rendered Records landing page.
// If the request is to `/records` with no query params, perform a server-side redirect
// to `/records/count` so a tab is always present (parity with previous client behavior).
export default async function RecordsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  // `searchParams` can be a Promise-like object in Next.js App Router; await it before accessing properties
  const params = await (async () => {
    if (!searchParams) return {};
    // If searchParams is thenable (a Promise), await it; otherwise use it directly
    if (typeof (searchParams as any)?.then === 'function') {
      return await (searchParams as any);
    }
    return searchParams;
  })();
  const hasQueryParams = Object.keys(params || {}).length > 0;

  // Show a summary page when no query params are present (overview of tabs/subtabs/filters)
  if (!hasQueryParams) {
    const summaryText = `Welcome to the Records section. This area groups player and tournament records into topics like Wins, Played, Titles, Entries, Ages, Timespan, Percentage, Round-on-Entries, Same (same tournament), Seasons, At Age, Age at Nth, Needed To, Counter Seasons, H2H and Streak. Each tab renders the component located under app/records/ for that topic (for example, Wins uses app/records/Wins/Wins.tsx), and available subtabs refine the query (for example Ages → Oldest / Youngest; Timespan → Entries / Titles / Rounds). Use the surface, level, round and bestOf filters to narrow the results; the UI enforces which filters are valid for each tab/subtab.`;

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <section className="mb-6 text-gray-200">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-4 text-white text-center">Records</h1>

          <RecordsTabs activeTab={null} activeSubTab={null} />

          <p className="text-gray-300 my-6 whitespace-pre-line">{summaryText}</p>

          <RecordsOverviewTree />

          <RecordsFilters activeTab={null} activeSubTab={null} searchParams={{}} />
        </section>
      </main>
    );
  }

  const record = typeof params.record === 'string' ? String(params.record) : null;
  const sub = typeof params.subtab === 'string' ? String(params.subtab) : (typeof params.tab === 'string' ? String(params.tab) : null);

  const description = generateRecordDescription(record, {
    ages: 'oldest', timespan: 'entries', roundsonentries: 'titles', same: 'wins', seasons: 'wins', atage: 'wins', ageofnth: 'wins', neededto: 'titles', counterseasons: 'round', streak: 'wins', h2h: 'count'
  }, new Set(), new Set(), '', null);

  const canonicalUrl = new URL(`/records/${record || ''}${sub ? `/${sub}` : ''}`, metadataBase).toString();

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{record ? String(record).toUpperCase() : ''}</h1>
        <RecordsTabs activeTab={record || null} activeSubTab={sub || null} />
        {description ? <p className="text-gray-300 mb-4">{description}</p> : <p className="text-gray-300">Records</p>}
        <RecordsFilters activeTab={record || ''} activeSubTab={sub} searchParams={params} />
      </section>
      <RecordsFilteredServer record={record} sub={sub} filters={params} canonicalUrl={canonicalUrl} />
    </main>
  );
}