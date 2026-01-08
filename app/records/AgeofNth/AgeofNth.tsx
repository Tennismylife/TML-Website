'use client'

import { useState } from 'react';

import InSlamsSection from './InSlamsSection';
import RoundSection from './RoundSection';
import WinsSection from './WinsSection';
import PlayedSection from './PlayedSection';
import EntriesSection from './EntriesSection';
import TitlesSection from './TitlesSection';

interface AgeofNthProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  prefetchedData?: Record<string, any[] | undefined>;
  initialNth?: number;
  description?: string;
}

export default function AgeofNth({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  prefetchedData,
  initialNth,
  description,
}: AgeofNthProps) {
  const safeInitialNth = Number.isFinite(initialNth) ? (initialNth as number) : (activeSubTab === 'round' ? 1 : 50);

  return (
    <section className="mb-8">
      {activeSubTab === 'slams' && (
        <InSlamsSection 
          selectedSurfaces={selectedSurfaces}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.slams as any[]}
          initialNth={safeInitialNth}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection 
          selectedSurfaces={selectedSurfaces} 
          selectedLevels={selectedLevels} 
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.round as any[]}
          initialNth={safeInitialNth}
        />
      )}

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
          initialData={prefetchedData?.wins as any[]}
          initialNth={safeInitialNth}
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
          initialData={prefetchedData?.played as any[]}
          initialNth={safeInitialNth}
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
          initialNth={safeInitialNth}
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
          initialData={prefetchedData?.titles as any[]}
          initialNth={safeInitialNth}
        />
      )}
    </section>
  );
}
