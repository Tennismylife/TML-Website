import React from 'react';
import TitlesClient from './TitlesClient';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  // Return the exact requested title format for Ages Titles
  return { title: `${tournamentName} Title Age Records | Tennis Records` };
}

export default async function Page({ params }: any) {
  // params may be a Promise in this Next.js version; await it on the server
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);

  // Render a server-side H1 so this page has an authoritative title like "{Tournament} | Title Age Records"
  return (
    <div>
      <main className="w-full mx-auto text-white">
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`${tournamentName} | Title Age Records`}</h1>
        <TitlesClient id={id} />
      </main>
    </div>
  );
}
