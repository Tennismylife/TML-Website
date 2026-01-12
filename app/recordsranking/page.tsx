import React from 'react';
import RecordsRankingClient from './RecordsRankingClient';
import Count from "./Count/page";

export default async function RecordsRankingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  // default server-rendered content is Count
  return (
    <main>
      <RecordsRankingClient currentTabSeg={'count'} currentSubSeg={null} />
      <div className="mt-6 w-full">
        <Count searchParams={searchParams} />
      </div>
    </main>
  );
}
