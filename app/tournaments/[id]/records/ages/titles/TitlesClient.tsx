"use client";

import React from 'react';
import RecordsPageClient from '@/app/tournaments/[id]/records/RecordsClient';

export default function TitlesClient({ id, initialData }: { id: string; initialData?: any }) {
  // Render the client Records component so it picks up the pathname and sets the "titles" subtab
  return (
    <RecordsPageClient
      params={Promise.resolve({ id })}
      initialActiveTab="ages"
      initialAgeSubTab="titles"
      initialAgesData={initialData}
    />
  );
}
