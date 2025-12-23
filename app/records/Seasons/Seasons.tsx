// app/records/Seasons/Seasons.tsx

'use client'

import { useState, useEffect } from 'react';
import PercentageSection from './PercentageSection';
import RoundSection from './RoundsSection';
import WinsSection from './WinsSection';
import PlayedSection from './PlayedSection';
import EntriesSection from './EntriesSection';
import TitlesSection from './TitlesSection';

interface SeasonsProps {
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

export default function Seasons({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, setFetchEnabled, fetchRequestId, description }: SeasonsProps) {
  // No top-level data fetch here; children handle fetching like in `Same`.
  const [loading, setLoading] = useState(false);




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
      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
        />
      )}
      {activeSubTab === 'percentage' && (
        <PercentageSection
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

    </section>
  );
}
