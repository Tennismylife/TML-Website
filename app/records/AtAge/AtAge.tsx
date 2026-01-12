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
  activeSubTab?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  prefetchedData?: Record<string, any[] | undefined>;
  initialAge?: number;
  description?: string;
}

export default function AtAge({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  prefetchedData,
  initialAge,
  description,
}: AtAgeProps) {
  const safeInitialAge = Number.isFinite(initialAge) ? (initialAge as number) : 25;
  return (
    <section className="mb-8">
      {activeSubTab === 'slams' && (
        <InSlamsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedRounds={selectedRounds} // InSlamsSection sembra usare singolare
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          description={description}
          initialData={prefetchedData?.slams as any[]}
          initialAge={safeInitialAge}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRound={selectedRounds} // singolare corretto
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.round as any[]}
          initialAge={safeInitialAge}
        />
      )}

      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.wins as any[]}
          initialAge={safeInitialAge}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds} // array
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.played as any[]}
          initialAge={safeInitialAge}
        />
      )}

      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.entries as any[]}
          initialAge={safeInitialAge}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles as any[]}
          initialAge={safeInitialAge}
        />
      )}
    </section>
  );
}
