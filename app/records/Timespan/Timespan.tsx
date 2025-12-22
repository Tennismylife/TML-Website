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
  fetchEnabled?: boolean;
}

export default function Timespan({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedTab,
  onTabChange,
  fetchEnabled
}: TimespanProps) {
  const surfacesArray = Array.from(selectedSurfaces);
  const levelsArray = Array.from(selectedLevels);

  return (
    <section className="mb-8">
      {selectedTab === "entries" ? (
        <Entries selectedSurfaces={surfacesArray} selectedLevels={levelsArray} fetchEnabled={fetchEnabled} />
      ) : selectedTab === "titles" ? (
        <Titles selectedSurfaces={surfacesArray} selectedLevels={levelsArray} fetchEnabled={fetchEnabled} />
      ) : (
        <Rounds
          selectedSurfaces={surfacesArray}
          selectedLevels={levelsArray}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
        />
      )}
    </section>
  );
}
