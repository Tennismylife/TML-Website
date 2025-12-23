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
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
}

export default function Same({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, setFetchEnabled, fetchRequestId, description }: SameProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
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
        />
      )}
      {activeSubTab === 'round' && (
        <SameRoundSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRound={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          description={description}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
        />
      )}
    </section>
  );
}
