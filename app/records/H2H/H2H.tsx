'use client'

import React from 'react';
import Modal from '@/components/Modal';
import CountSection from './CountSection';
import SeasonsSection from './SeasonsSection';
import SameTournamentSection from './SameTournamentSection';
import TimespanSection from './TimespanSection';

interface H2HSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | number;
}

export default function H2HSection({ 
  selectedSurfaces, 
  selectedLevels, 
  selectedRounds, 
  selectedBestOf, 
  activeSubTab,
  fetchEnabled,
  fetchRequestId
}: H2HSectionProps) {
  const [showModal, setShowModal] = React.useState(false);
  const enabled = !!fetchEnabled;

  // If fetching is not enabled and the parent modal is not open, show a hint
  if (!enabled && !showModal) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Head-to-Head (H2H)</h2>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
        <div className="text-center py-8 text-gray-300">Clicca "View All" per caricare i dati H2H.</div>
      </section>
    );
  }

  return (
    <section className="rounded p-4">
      {activeSubTab === 'count' && (
        <CountSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
          parentShowModal={showModal}
        />
      )}
      {activeSubTab === 'seasons' && (
        <SeasonsSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
          parentShowModal={showModal}
        />
      )}
      {activeSubTab === 'tournament' && (
        <SameTournamentSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
          parentShowModal={showModal}
        />
      )}
      {activeSubTab === 'timespan' && (
        <TimespanSection
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
          parentShowModal={showModal}
        />
      )} 

      {/* Parent modal to show full active subtab data */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="H2H — Full Data">
        {activeSubTab === 'count' && (
          <CountSection
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            selectedRounds={selectedRounds}
            selectedBestOf={selectedBestOf}
            fetchEnabled={true}
            fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
            parentShowModal={true}
          />
        )}
        {activeSubTab === 'seasons' && (
          <SeasonsSection
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            selectedRounds={selectedRounds}
            fetchEnabled={true}
            fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
            parentShowModal={true}
          />
        )}
        {activeSubTab === 'tournament' && (
          <SameTournamentSection
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            selectedRounds={selectedRounds}
            fetchEnabled={true}
            fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
            parentShowModal={true}
          />
        )}
        {activeSubTab === 'timespan' && (
          <TimespanSection
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            selectedRounds={selectedRounds}
            fetchEnabled={true}
            fetchRequestId={fetchRequestId != null ? String(fetchRequestId) : undefined}
            parentShowModal={true}
          />
        )}
      </Modal>
    </section>
  );
}
