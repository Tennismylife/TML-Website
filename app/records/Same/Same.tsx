'use client'

import WinsSection from './WinsSection';
import PlayedSection from './PlayedSection';
import EntriesSection from './EntriesSection';
import TitlesSection from './TitlesSection';
import SameRoundSection from './RoundSection';

interface SameProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
}

export default function Same({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab }: SameProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
        />
      )}

      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
        />
      )}
      {activeSubTab === 'round' && (
        <SameRoundSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRound={selectedRounds}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
        />
      )}
    </section>
  );
}
