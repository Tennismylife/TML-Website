import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName } from '@/lib/getTournamentName';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  // Return the requested site SEO title for the ages main page
  return { title: `${tournamentName} Age Records | Tennis My Life` };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);

  // Render a server-side H1 so this page has an authoritative title like "{tournamentName} | Ages"
  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`${tournamentName} | Ages`}</h1>
        {/* Render the full Tournament records page (client) so the page includes header, tabs and the AgesSection */}
        {/* Pass params as a resolved promise so the client component receives the same shape it expects */}
        {/* @ts-ignore - TournamentPage is a client component */}
        <TournamentPage params={Promise.resolve({ id, tab: 'ages' })} />
      </main>
    </div>
  );
}
