'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface CountSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
}

interface PlayerInfo {
  name: string;
  ioc: string;
}

interface EntryData {
  tourney_id: string;
  age: number;
}

interface CountData {
  playerAgeWins: [string, number[]][];
  playerAgePlayed: [string, number[]][];
  playerAgeEntries: [string, EntryData[]][];
  playerAgeTitles: [string, number[]][];
  playerInfo: [string, PlayerInfo][];
}

interface FilteredPlayer {
  id: string;
  name: string;
  ioc: string;
  count: number;
}

export default function CountSection({ selectedSurfaces, selectedLevels }: CountSectionProps) {
  const [data, setData] = useState<CountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [selectedWinsAgeDays, setSelectedWinsAgeDays] = useState(25 * 365 + 23);
  const [selectedPlayedAgeDays, setSelectedPlayedAgeDays] = useState(25 * 365 + 23);
  const [selectedEntriesAgeDays, setSelectedEntriesAgeDays] = useState(25 * 365 + 23);
  const [selectedTitlesAgeDays, setSelectedTitlesAgeDays] = useState(25 * 365 + 23);

  const [showModal, setShowModal] = useState<null | 'wins' | 'played' | 'entries' | 'titles'>(null);

  // Stable fetch effect
  useEffect(() => {
    const query = new URLSearchParams();
    Array.from(selectedSurfaces).forEach(s => query.append('surface', s));
    Array.from(selectedLevels).forEach(l => query.append('level', l));
    const url = `/api/records/atage/count${query.toString() ? '?' + query.toString() : ''}`;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [JSON.stringify(Array.from(selectedSurfaces)), JSON.stringify(Array.from(selectedLevels))]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  const { playerAgeWins, playerAgePlayed, playerAgeEntries, playerAgeTitles, playerInfo } = data;
  const playerInfoMap = new Map(playerInfo);

  // Generic filtering function
  const filterPlayerData = <T extends number | EntryData>(
    playerMap: Map<string, T[]>,
    maxAge: number,
    getCount: (arr: T[], maxAge: number) => number
  ): FilteredPlayer[] => {
    const result: FilteredPlayer[] = [];
    for (const [playerId, arr] of playerMap) {
      const count = getCount(arr, maxAge);
      if (count > 0) {
        const info = playerInfoMap.get(playerId);
        if (info) result.push({ id: playerId, name: info.name, ioc: info.ioc, count });
      }
    }
    return result.sort((a, b) => b.count - a.count);
  };

  const playerAgeWinsMap = new Map(playerAgeWins);
  const playerAgePlayedMap = new Map(playerAgePlayed);
  const playerAgeEntriesMap = new Map(playerAgeEntries);
  const playerAgeTitlesMap = new Map(playerAgeTitles);

  const filteredWins = filterPlayerData(playerAgeWinsMap, selectedWinsAgeDays / 365, (ages) =>
    (ages as number[]).filter(age => age <= selectedWinsAgeDays / 365).length
  );

  const filteredPlayed = filterPlayerData(playerAgePlayedMap, selectedPlayedAgeDays / 365, (ages) =>
    (ages as number[]).filter(age => age <= selectedPlayedAgeDays / 365).length
  );

  const filteredEntries = filterPlayerData(playerAgeEntriesMap, selectedEntriesAgeDays / 365, (entries) => {
    const uniqueTourneys = new Set((entries as EntryData[]).filter(e => e.age <= selectedEntriesAgeDays / 365).map(e => e.tourney_id));
    return uniqueTourneys.size;
  });

  const filteredTitles = filterPlayerData(playerAgeTitlesMap, selectedTitlesAgeDays / 365, (ages) =>
    (ages as number[]).filter(age => age <= selectedTitlesAgeDays / 365).length
  );

  const maxAgeDays = 50 * 365; // fallback

  const renderTable = (data: FilteredPlayer[], label: string) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 w-1/2">Player</th>
          <th className="text-left py-1 w-1/2">{label}</th>
        </tr>
      </thead>
      <tbody>
        {data.map(p => (
          <tr key={p.id} className="border-b">
            <td className="py-1 flex items-center gap-2 w-1/2">
              <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
              <Link href={`/players/${encodeURIComponent(p.id)}`} className="text-blue-700 hover:underline">
                {p.name}
              </Link>
            </td>
            <td className="py-1 w-1/2">{p.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          {children}
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Close</button>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded border bg-white p-4">
      <div className="grid grid-cols-1 gap-4">
        {[
          { label: 'Wins', selectedAgeDays: selectedWinsAgeDays, setSelectedAgeDays: setSelectedWinsAgeDays, filteredData: filteredWins, modalKey: 'wins' },
          { label: 'Played', selectedAgeDays: selectedPlayedAgeDays, setSelectedAgeDays: setSelectedPlayedAgeDays, filteredData: filteredPlayed, modalKey: 'played' },
          { label: 'Entries', selectedAgeDays: selectedEntriesAgeDays, setSelectedAgeDays: setSelectedEntriesAgeDays, filteredData: filteredEntries, modalKey: 'entries' },
          { label: 'Titles', selectedAgeDays: selectedTitlesAgeDays, setSelectedAgeDays: setSelectedTitlesAgeDays, filteredData: filteredTitles, modalKey: 'titles' },
        ].map(({ label, selectedAgeDays, setSelectedAgeDays, filteredData, modalKey }) => {
          const years = Math.floor(selectedAgeDays / 365);
          const days = selectedAgeDays % 365;
          return (
            <div key={label} className="border rounded p-4 bg-gray-50">
              <div className="mb-4 flex gap-4 items-center">
                <label className="flex items-center gap-2 flex-1">
                  Max Age for {label}: {years}y {days}d
                  <input
                    type="range"
                    min={0}
                    max={maxAgeDays}
                    value={selectedAgeDays}
                    onChange={(e) => setSelectedAgeDays(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
              <h3 className="font-medium mb-2">{label} at Age</h3>
              {filteredData.length > 0 ? (
                <>
                  {renderTable(filteredData.slice(0, 10), label)}
                  <button onClick={() => setShowModal(modalKey as any)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                    View All
                  </button>
                </>
              ) : (
                <p className="text-gray-600">No data available for ages up to this.</p>
              )}
            </div>
          );
        })}
      </div>

      <Modal show={showModal === 'wins'} onClose={() => setShowModal(null)} title={`Wins at Age`}>
        {renderTable(filteredWins, 'Wins')}
      </Modal>
      <Modal show={showModal === 'played'} onClose={() => setShowModal(null)} title={`Played at Age`}>
        {renderTable(filteredPlayed, 'Played')}
      </Modal>
      <Modal show={showModal === 'entries'} onClose={() => setShowModal(null)} title={`Entries at Age`}>
        {renderTable(filteredEntries, 'Entries')}
      </Modal>
      <Modal show={showModal === 'titles'} onClose={() => setShowModal(null)} title={`Titles at Age`}>
        {renderTable(filteredTitles, 'Titles')}
      </Modal>
    </section>
  );
}
