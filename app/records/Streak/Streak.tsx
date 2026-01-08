'use client'

import React from 'react';
import RoundSection from './RoundSection';
import WinsSection from './WinsSection';

interface StreakSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | number | null;
  prefetchedData?: Record<string, any[] | undefined>;
  description?: string;
}

export default function StreakSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  activeSubTab,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  prefetchedData,
  description
}: StreakSectionProps) {
  const effectiveFetchId = fetchRequestId != null ? String(fetchRequestId) : undefined;

  const commonProps = {
    selectedSurfaces,
    selectedLevels,
    selectedRounds,
    selectedBestOf,
    fetchEnabled,
    setFetchEnabled,
    fetchRequestId: effectiveFetchId,
    description,
  } as const;

  return (
    <section className="rounded p-4">
      {activeSubTab === 'wins' && (
        <WinsSection
          {...commonProps}
          initialData={prefetchedData?.wins as any[] | undefined}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection
          {...commonProps}
          initialData={prefetchedData?.round as any[] | undefined}
        />
      )}
    </section>
  );
}
