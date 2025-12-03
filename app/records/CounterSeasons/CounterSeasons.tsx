// app/records/NeededTo/NeededTo.tsx

'use client'

import React from 'react';
import TitlesSection from './TitlesSection';
import RoundsSection from './RoundsSection';

interface NeededToSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab: string;
}

export default function CounterSeason({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab }: NeededToSectionProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
        />
      )}
      {activeSubTab === 'rounds' && (
        <RoundsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRound={selectedRounds || 'F'}
        />
      )}
    </section>
  );
}