'use client'

import React from 'react';
import TitlesSection from './TitlesSection';
import RoundsSection from './RoundsSection';

interface NeededToSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  prefetchedData?: Record<string, any[] | undefined>;
  initialNth?: number;
  initialRoundNumber?: number;
  description?: string;
}

export default function NeededToSection({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, setFetchEnabled, fetchRequestId, prefetchedData, initialNth, initialRoundNumber, description }: NeededToSectionProps) {
  return (
    <section className="mb-8">
      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles as any[]}
          initialNth={initialNth}
        />
      )}
      {activeSubTab === 'rounds' && (
        <RoundsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.rounds as any[]}
          initialNth={initialRoundNumber}
        />
      )}
    </section>
  );
}
