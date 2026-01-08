import type { Metadata } from 'next';
import React from 'react';
import { getRecords } from 'lib/getRecords';
import RecordsTable from '../RecordsTable';
import { generateRecordDescription } from 'lib/generateRecordDescription';
import { notFound } from 'next/navigation';

type Params = { tab: string };

const TABS = ['wins', 'played', 'titles', 'entries'] as const;
const SURFACES = ['Hard', 'Clay', 'Grass'] as const;
const ROUNDS = ['F', 'SF', 'QF'] as const;

export async function generateStaticParams(): Promise<Params[]> {
  // We static-generate only the tab-level pages here, but the nested path-based pages will be pre-generated separately
  return TABS.map(t => ({ tab: t }));
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Record<string, string | string[] | undefined> }): Promise<Metadata> {
  const tab = params.tab;
  if (!TABS.includes(tab as typeof TABS[number])) return { title: 'Not found' };

  const surface = Array.isArray(searchParams.surface) ? searchParams.surface[0] : searchParams.surface;
  const round = Array.isArray(searchParams.round) ? searchParams.round[0] : searchParams.round;

  if (surface && !SURFACES.includes(surface as typeof SURFACES[number])) return { title: 'Not found' };
  if (round && !ROUNDS.includes(round as typeof ROUNDS[number])) return { title: 'Not found' };

  const title = `${tab.charAt(0).toUpperCase() + tab.slice(1)} Records${surface ? ` – ${surface}` : ''}${round ? ` – ${round}` : ''}`;
  const description = `Top ${tab} records${surface ? ` on ${surface}` : ''}${round ? `, round ${round}` : ''}`;
  const qp = new URLSearchParams();
  if (surface) qp.set('surface', surface);
  if (round) qp.set('round', round);
  const canonical = qp.toString() ? `/records/${encodeURIComponent(tab)}?${qp.toString()}` : `/records/${encodeURIComponent(tab)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  } as Metadata;
}

export default async function Page({ params, searchParams }: { params: Params; searchParams: Record<string, string | string[] | undefined> }) {
  const tab = params.tab;
  if (!TABS.includes(tab as typeof TABS[number])) return notFound();

  const surface = Array.isArray(searchParams.surface) ? searchParams.surface[0] : searchParams.surface;
  const round = Array.isArray(searchParams.round) ? searchParams.round[0] : searchParams.round;

  // Validate filters if present
  if (surface && !SURFACES.includes(surface as typeof SURFACES[number])) return notFound();
  if (round && !ROUNDS.includes(round as typeof ROUNDS[number])) return notFound();

  const data = await getRecords(tab, surface ?? undefined, round ?? undefined);

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{`${tab.charAt(0).toUpperCase() + tab.slice(1)} Records`}</h1>
        <p className="text-gray-300">{generateRecordDescription(tab as string, {
          ages: 'oldest',
          timespan: 'entries',
          roundsonentries: 'titles',
          same: 'wins',
          seasons: 'wins',
          atage: 'wins',
          ageofnth: 'wins',
          neededto: 'titles',
          counterseasons: 'round',
          streak: 'wins',
          h2h: 'count',
        }, surface ? new Set([surface]) : new Set(), new Set(), round ?? '', undefined)}</p>
      </section>

      <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
        <RecordsTable data={data} />
      </section>
    </main>
  );
}
