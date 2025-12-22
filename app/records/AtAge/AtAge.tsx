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
  fetchEnabled?: boolean;
}

export default function AtAge({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
  fetchEnabled,
}: AtAgeProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'slams' && (
        <InSlamsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedRounds={selectedRounds} // InSlamsSection sembra usare singolare
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRound={selectedRounds} // singolare corretto
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
        />
      )}
    </section>
  );
}
