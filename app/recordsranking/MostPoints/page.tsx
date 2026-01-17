import React from 'react';
import type { Metadata } from 'next';
import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string) ?? 'Overall';
  return { title: subtab === 'EndOfTheSeason' ? 'Most ATP Points at the End of The Season | ATP Ranking Records' : 'Most ATP Points | ATP Ranking Records' };
}

export default async function MostPointsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string) ?? 'Overall';

  return (
    <div>
      {subtab === 'Overall' ? <Overall searchParams={searchParams} /> : <EndOfTheSeason searchParams={searchParams} />}
    </div>
  );
}
