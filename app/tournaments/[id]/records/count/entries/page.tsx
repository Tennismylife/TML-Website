import React from 'react';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await getTournamentName(id);
  // Use the requested phrasing
  return { title: `Most Entries at ${tournamentName}` };
}

export default async function EntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await getTournamentName(id);

  return (
    <div className="w-full mx-auto p-8 text-white">
      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <h1 className="text-3xl font-extrabold mb-4">{`Most Entries at ${tournamentName}`}</h1>
        <CountFull id={id} section="entries" />
      </main>
    </div>
  );
}
