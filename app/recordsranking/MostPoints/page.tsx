import React from 'react';
import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export default function MostPointsPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const subtab = (searchParams?.subtab as string) ?? 'Overall';

  return (
    <div>
      {subtab === 'Overall' ? <Overall searchParams={searchParams} /> : <EndOfTheSeason searchParams={searchParams} />}
    </div>
  );
} 
