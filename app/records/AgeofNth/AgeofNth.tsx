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
}

export default function AgeofNth({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled }: AgeofNthProps) {
  return (
    
    <section className="mb-8">
      {activeSubTab === 'slams' && (
        <InSlamsSection 
        selectedSurfaces={Array.from(selectedSurfaces)} 
        selectedRounds={selectedRounds}
        fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'round' && (
        <RoundSection 
        selectedSurfaces={selectedSurfaces} 
        selectedLevels={selectedLevels} 
        selectedRounds={selectedRounds}
        fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
          fetchEnabled={fetchEnabled}
        />
      )}

      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
        />
      )}

      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
        />
      )}
    </section>
  );
}
