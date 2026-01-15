import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  return { title: makeTitle('Win Percentage Per Round', tournamentName) };
}

export default function Page({ params }: any) {
  const p = (React as any).use ? (React as any).use(params) : params;
  const { id } = p;
  // Ensure server renders an H1 for the percentage tab
  return <TournamentPage params={Promise.resolve({ id, tab: 'percentage' })} />;
}