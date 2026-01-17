import React from 'react';
import type { Metadata } from 'next';
import RecordsRankingClient from './RecordsRankingClient';
import Count from "./Count/page";

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  return { title: `Weeks at No. ${rank} | ATP Ranking Records` };
}

export default async function RecordsRankingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const initialRank = Number((sp.rank as string) ?? 1);
  // default server-rendered content is Count
  return (
    <main>
      <RecordsRankingClient currentTabSeg={'count'} currentSubSeg={null} />
      <h1 className="mb-8 text-3xl font-bold text-center text-gray-100">Weeks at No. {initialRank}</h1>
      <div className="mt-6 w-full">
        {await Count({ searchParams, showHeading: false } as any)}
      </div>
    </main>
  );
} 
