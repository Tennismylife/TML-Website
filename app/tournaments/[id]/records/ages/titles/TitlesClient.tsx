"use client";

import React from 'react';
import TournamentPage from '@/app/tournaments/[id]/records/page';

export default function TitlesClient({ id }: { id: string }) {
  // Render the client Tournament page so it picks up the pathname and sets the "titles" subtab
  // Pass tab so the server can render the H1 for Ages when needed
  return <TournamentPage params={Promise.resolve({ id, tab: 'ages' })} />;
}
