import React from 'react';
import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export default async function MostPointsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string) ?? 'Overall';

  return (
    <div>
      {subtab === 'Overall' ? <Overall searchParams={searchParams} /> : <EndOfTheSeason searchParams={searchParams} />}
    </div>
  );
}
