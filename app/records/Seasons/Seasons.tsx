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
}

export default function Seasons({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab }: SeasonsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    if (selectedRounds) query.append('round', selectedRounds);
    if (selectedBestOf) query.append('best_of', selectedBestOf.toString());
    const url = `/api/records/seasons${query.toString() ? '?' + query.toString() : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);


  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <section className="mb-8">
      {activeSubTab === 'wins' && (
        <WinsSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
        />
      )}
      {activeSubTab === 'played' && (
        <PlayedSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
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
        />
      )}
      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
        />
      )}
      {activeSubTab === 'percentage' && (
        <PercentageSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          selectedBestOf={selectedBestOf}
        />
      )}

    </section>
  );
}
