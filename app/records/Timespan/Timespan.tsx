'use client'

import Entries from './Entries';
import Titles from './Titles';
import Rounds from './Rounds';

interface TimespanProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export default function Timespan({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedTab,
  onTabChange
}: TimespanProps) {
  const surfacesArray = Array.from(selectedSurfaces);
  const levelsArray = Array.from(selectedLevels);

  return (
    <section className="mb-8">
      {selectedTab === "entries" ? (
        <Entries selectedSurfaces={surfacesArray} selectedLevels={levelsArray} />
      ) : selectedTab === "titles" ? (
        <Titles selectedSurfaces={surfacesArray} selectedLevels={levelsArray} />
      ) : (
        <Rounds
          selectedSurfaces={surfacesArray}
          selectedLevels={levelsArray}
          selectedRounds={selectedRounds}
        />
      )}
    </section>
  );
}
