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
}

export default function Seasons({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, setFetchEnabled }: SeasonsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!fetchEnabled) return; // only fetch when explicitly allowed via click

    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    if (selectedRounds) query.append('round', selectedRounds);
    if (selectedBestOf) query.append('best_of', selectedBestOf.toString());
    const url = `/api/records/seasons${query.toString() ? '?' + query.toString() : ''}`;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        // do NOT clear fetchEnabled here; let the specific child that actually fetched clear it
      }
    })();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled]);

  // Fallback: clear fetchEnabled after a short timeout if it's still true (prevents leaving it on due to no child fetch)
  useEffect(() => {
    if (!fetchEnabled || !setFetchEnabled) return;
    const t = setTimeout(() => setFetchEnabled(false), 3000);
    return () => clearTimeout(t);
  }, [fetchEnabled, setFetchEnabled]);


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
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
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
        />
      )}
      {activeSubTab === 'entries' && (
        <EntriesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
        />
      )}
      {activeSubTab === 'titles' && (
        <TitlesSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
        />
      )}
      {activeSubTab === 'round' && (
        <RoundSection
          selectedSurfaces={Array.from(selectedSurfaces)}
          selectedLevels={Array.from(selectedLevels)}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          setFetchEnabled={setFetchEnabled}
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
        />
      )}

    </section>
  );
}
