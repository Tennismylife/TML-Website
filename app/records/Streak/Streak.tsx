'use client'

import React from 'react';
import RoundSection from './RoundSection';
import WinsSection from './WinsSection';

interface StreakSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
  fetchEnabled?: boolean;
  description?: string;
}

export default function StreakSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
  fetchEnabled,
  description
}: StreakSectionProps) {

  return (
    <section className="rounded p-4">
      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          description={description}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          description={description}
        />
      )}
    </section>
  );
}
