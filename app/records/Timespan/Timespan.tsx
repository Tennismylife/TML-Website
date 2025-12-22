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
  fetchRequestId?: string | null;
}

export default function Timespan({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedTab,
  onTabChange,
  fetchEnabled,
  fetchRequestId
}: TimespanProps) {
  return (
    <section className="mb-8">
      {selectedTab === "entries" ? (
        <Entries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />
      ) : selectedTab === "titles" ? (
        <Titles selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />
      ) : (
        <Rounds
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
        />
      )}
    </section>
  );
} 
