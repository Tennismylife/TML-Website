"use client";

import React from 'react';
import RecordsPageClient from '@/app/tournaments/[id]/records/RecordsClient';

export default function TitlesClient({ id }: { id: string }) {
  // Render the client Records component so it picks up the pathname and sets the "titles" subtab
  return <RecordsPageClient params={Promise.resolve({ id })} />;
}
