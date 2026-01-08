'use client'

import Entries from './Entries';
import Titles from './Titles';
import Rounds from './Rounds';

interface TimespanProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedTab: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  prefetchedData?: Record<string, any[] | undefined>;
}

export default function Timespan({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedTab,
  fetchEnabled,
  fetchRequestId,
  description,
  prefetchedData
}: TimespanProps) {
  return (
    <section className="mb-8">
      {selectedTab === "entries" ? (
        <Entries
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.entries}
        />
      ) : selectedTab === "titles" ? (
        <Titles
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles}
        />
      ) : (
        <Rounds
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.rounds}
        />
      )}
    </section>
  );
}
