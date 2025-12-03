'use client'

import { useState } from 'react';
import Titles from './Titles';
import Rounds from './Rounds';

interface RoundsonentriesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab: string;
}

export default function Roundsonentries({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab }: RoundsonentriesProps) {
  const [minEntries, setMinEntries] = useState(0);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-white">Rounds on Entries</h2>

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
        <Titles selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} minEntries={minEntries} />
      ) : (
        <Rounds
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          minEntries={minEntries}
        />
      )}
    </section>
  );
}
