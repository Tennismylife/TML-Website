'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface SeasonsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string; // può essere "All"
}

interface H2HSeasonRecord {
  player1: { id: string; name: string; ioc: string };
  player2: { id: string; name: string; ioc: string };
  year: number;
  matches_played: number;
}

interface H2HSeasonResponse {
  h2h_season: H2HSeasonRecord[];
}

export default function SeasonsSection({ selectedSurfaces, selectedLevels, selectedRounds }: SeasonsSectionProps) {
  const [data, setData] = useState<H2HSeasonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlayers, setModalPlayers] = useState<H2HSeasonRecord[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Costruisco l'URL senza filtro per anno
    const url = '/api/records/h2h/seasons';

    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  const h2hSeasonArray = data?.h2h_season || [];

  const renderTable = (players: H2HSeasonRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Player 1</th>
            <th className="text-left py-1">Player 2</th>
            <th className="text-left py-1">Year</th>
            <th className="text-left py-1">Matches</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-gray-500">No data</td>
            </tr>
          ) : (
            players.map((p) => (
              <tr key={`${p.player1.id}-${p.player2.id}-${p.year}`} className="border-b">
                <td className="py-1">
                  <span className="text-base mr-1">{flagEmoji(iocToIso2(p.player1.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player1.id)}`} className="text-blue-700 hover:underline">
                    {p.player1.name}
                  </Link>
                </td>
                <td className="py-1">
                  <span className="text-base mr-1">{flagEmoji(iocToIso2(p.player2.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player2.id)}`} className="text-blue-700 hover:underline">
                    {p.player2.name}
                  </Link>
                </td>
                <td className="py-1">{p.year}</td>
                <td className="py-1">{p.matches_played}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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

  const previewPlayers = h2hSeasonArray.slice(0, 10);

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="text-lg font-bold mb-4">H2H in Same Season</h2>
      {renderTable(previewPlayers)}
      {h2hSeasonArray.length > 10 && (
        <button
          onClick={() => { setModalTitle('H2H in Same Season'); setModalPlayers(h2hSeasonArray); setShowModal(true); }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          View All
        </button>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={modalTitle}>
        {renderTable(modalPlayers)}
      </Modal>
    </section>
  );
}
