import type { Metadata } from 'next';
import React from 'react';
import { getRecords } from 'lib/getRecords';
import RecordsTable from '../../../RecordsTable';
import { generateRecordDescription } from 'lib/generateRecordDescription';
import { notFound } from 'next/navigation';

type Params = { tab: string; surface: string; round: string };

const TABS = ['wins', 'played', 'titles', 'entries'] as const;
const SURFACES = ['Hard', 'Clay', 'Grass'] as const;
const ROUNDS = ['F', 'SF', 'QF'] as const;

export async function generateStaticParams(): Promise<Params[]> {
  const out: Params[] = [];
  for (const tab of TABS) {
    for (const surface of SURFACES) {
      for (const round of ROUNDS) {
        out.push({ tab, surface, round });
      }
    }
  }
  return out;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tab, surface, round } = params;
  if (!TABS.includes(tab as typeof TABS[number])) return { title: 'Not found' };
  if (!SURFACES.includes(surface as typeof SURFACES[number])) return { title: 'Not found' };
  if (!ROUNDS.includes(round as typeof ROUNDS[number])) return { title: 'Not found' };

  const title = `${tab.charAt(0).toUpperCase() + tab.slice(1)} Records – ${surface} – ${round}`;
  const description = `Top ${tab} records on ${surface} surface, round ${round}`;
  const canonical = `/records/${encodeURIComponent(tab)}?surface=${encodeURIComponent(surface)}&round=${encodeURIComponent(round)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  } as Metadata;
}

export default async function Page({ params }: { params: Params }) {
  const { tab, surface, round } = params;
  if (!TABS.includes(tab as typeof TABS[number])) return notFound();
  if (!SURFACES.includes(surface as typeof SURFACES[number])) return notFound();
  if (!ROUNDS.includes(round as typeof ROUNDS[number])) return notFound();

  const data = await getRecords(tab, surface, round);

  const title = `${tab.charAt(0).toUpperCase() + tab.slice(1)} Records – ${surface} – ${round}`;

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{title}</h1>
        <p className="text-gray-300">{`Records for ${tab} on ${surface} — round ${round}`}</p>
      </section>

      <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
        <RecordsTable data={data} />
      </section>
    </main>
  );
}
