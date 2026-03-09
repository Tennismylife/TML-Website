'use client'

import React from 'react';
import Modal from '@/components/Modal';
import CountSection from './CountSection';
import TimespanSection from './TimespanSection';

interface H2HSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | number | null;
  prefetchedData?: Record<string, any[] | undefined>;
  description?: string;
}

export default function H2HSection({ 
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
}: H2HSectionProps) {
  const [showModal, setShowModal] = React.useState(false);
  const effectiveFetchId = fetchRequestId != null ? String(fetchRequestId) : undefined;
  const hasPrefetch = !!(prefetchedData && Object.values(prefetchedData).some(Boolean));
  const enabled = !!fetchEnabled || hasPrefetch;

  if (!enabled && !showModal) {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-200">Head-to-Head (H2H)</h2>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            View All
          </button>
        </div>
        <div className="py-8 text-center text-gray-300">Clicca "View All" per caricare i dati H2H.</div>
      </section>
    );
  }

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
      {activeSubTab === 'count' && (
        <CountSection
          {...commonProps}
          initialData={prefetchedData?.count as any[] | undefined}
          parentShowModal={showModal}
        />
      )}
      {activeSubTab === 'timespan' && (
        <TimespanSection
          {...commonProps}
          initialData={prefetchedData?.timespan as any[] | undefined}
          parentShowModal={showModal}
        />
      )} 

      <Modal show={showModal} onClose={() => setShowModal(false)} title="H2H — Full Data">
        {activeSubTab === 'count' && (
          <CountSection
            {...commonProps}
            fetchEnabled
            initialData={prefetchedData?.count as any[] | undefined}
            parentShowModal
          />
        )}
        {activeSubTab === 'timespan' && (
          <TimespanSection
            {...commonProps}
            fetchEnabled
            initialData={prefetchedData?.timespan as any[] | undefined}
            parentShowModal
          />
        )}
      </Modal>
    </section>
  );
}
