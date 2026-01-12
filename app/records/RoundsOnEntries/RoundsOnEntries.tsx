'use client'

import React from 'react';
import { useState } from 'react';
import Titles from './Titles';
import Rounds from './Rounds';

interface RoundsonentriesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  prefetchedData?: Record<string, any[] | undefined>;
}

export default function Roundsonentries({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, description, prefetchedData }: RoundsonentriesProps) {
  const enabled = !!fetchEnabled;
  const [minEntries, setMinEntries] = useState(1);

  return (
    <section className="mb-8">
      {description && (
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h1>
      )}

      {/* Minimum Entries Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-white">Minimum Entries: {minEntries}</label>
        <input
          type="range"
          min="1"
          max="100"
          value={minEntries}
          onChange={(e) => setMinEntries(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {activeSubTab === 'titles' ? (
        <Titles
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          minEntries={minEntries}
          fetchEnabled={enabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles as any[]}
        />
      ) : (
        <Rounds
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          minEntries={minEntries}
          fetchEnabled={enabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.round as any[]}
        />
      )}
    </section>
  );
}
