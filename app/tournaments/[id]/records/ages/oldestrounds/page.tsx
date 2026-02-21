import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName } from '@/lib/getTournamentName';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  return { title: `Oldest Round Appearances at the ${tournamentName} | Tennis Records` };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);

  // Render a server-side H1 for the Oldest per-round overview
  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Oldest per Round at ${tournamentName}`}</h1>
        {/* Pass tab so the client renders the AgesSection in the correct subtab */}
        {/* @ts-ignore - TournamentPage is a client component */}
        <TournamentPage params={Promise.resolve({ id, tab: 'ages' })} />
      </main>
    </div>
  );
}