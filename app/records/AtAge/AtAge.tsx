'use client'

import InSlamsSection from './InSlamsSection';
import RoundSection from './RoundSection';
import WinsSection from './WinsSection';
import PlayedSection from './PlayedSection';
import EntriesSection from './EntriesSection';
import TitlesSection from './TitlesSection';

interface AtAgeProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string; // singolare per RoundSection
  selectedBestOf: number | null;
  activeSubTab: string;
}

export default function AtAge({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
}: AtAgeProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">At Age</h2>

      {activeSubTab === 'slams' && (
        <InSlamsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedRounds={selectedRounds} // InSlamsSection sembra usare singolare
          selectedBestOf={selectedBestOf}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRound={selectedRounds} // singolare corretto
        />
      )}

      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
        />
      )}

      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
        />
      )}
    </section>
  );
}
