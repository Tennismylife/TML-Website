'use client'

import React from 'react';
import CountSection from './CountSection';
import SeasonsSection from './SeasonsSection';
import SameTournamentSection from './SameTournamentSection';
import TimespanSection from './TimespanSection';

interface H2HSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
}

export default function H2HSection({ 
  selectedSurfaces, 
  selectedLevels, 
  selectedRounds, 
  selectedBestOf, 
  activeSubTab 
}: H2HSectionProps) {
  return (
    <section className="rounded p-4">
      {activeSubTab === 'count' && (
        <CountSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
        />
      )}
      {activeSubTab === 'seasons' && (
        <SeasonsSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
        />
      )}
      {activeSubTab === 'tournament' && (
        <SameTournamentSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
        />
      )}
      {activeSubTab === 'timespan' && (
        <TimespanSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
        />
      )}
    </section>
  );
}
