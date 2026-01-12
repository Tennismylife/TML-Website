'use client'

import React from 'react';
import TitlesSection from './TitlesSection';
import RoundsSection from './RoundsSection';

interface CounterSeasonsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  prefetchedData?: Record<string, any[] | undefined>;
  initialSeasons?: number;
  description?: string;
}

export default function CounterSeasonsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, setFetchEnabled, fetchRequestId, prefetchedData, initialSeasons, description }: CounterSeasonsSectionProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles as any[]}
          initialSeasons={initialSeasons}
        />
      )}
      {activeSubTab === 'round' && (
        <RoundsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRound={selectedRounds || 'F'}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.rounds as any[]}
          initialSeasons={initialSeasons}
        />
      )}
    </section>
  );
}