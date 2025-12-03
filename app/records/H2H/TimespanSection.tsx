'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface TimespanSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string; // può essere "All"
}

interface H2HTimespanRecord {
  player1: { id: string; name: string; ioc: string };
  player2: { id: string; name: string; ioc: string };
  firstMatch: string;
  lastMatch: string;
  firstTournament: string;
  lastTournament: string;
  timespanDays: number;
  matches: number;
}

interface H2HTimespanResponse {
  h2hTimespans: H2HTimespanRecord[];
}

export default function TimespanSection({ selectedSurfaces, selectedLevels, selectedRounds }: TimespanSectionProps) {
  const [data, setData] = useState<H2HTimespanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlayers, setModalPlayers] = useState<H2HTimespanRecord[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    if (selectedRounds && selectedRounds !== 'All') {
      query.append('round', selectedRounds);
    }

    const url = `/api/records/h2h/timespan${query.toString() ? '?' + query.toString() : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  const h2hTimespanArray = data?.h2hTimespans || [];

  const renderTable = (players: H2HTimespanRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Player 1</th>
            <th className="text-left py-1">Player 2</th>
            <th className="text-left py-1">First Match</th>
            <th className="text-left py-1">First Tournament</th>
            <th className="text-left py-1">Last Match</th>
            <th className="text-left py-1">Last Tournament</th>
            <th className="text-left py-1">Timespan (Days)</th>
            <th className="text-left py-1">Matches</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-2 text-gray-500">No data</td>
            </tr>
          ) : (
            players.map(p => (
              <tr key={`${p.player1.id}-${p.player2.id}`} className="border-b">
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
                <td className="py-1">{p.firstMatch}</td>
                <td className="py-1">{p.firstTournament}</td>
                <td className="py-1">{p.lastMatch}</td>
                <td className="py-1">{p.lastTournament}</td>
                <td className="py-1">{p.timespanDays}</td>
                <td className="py-1">{p.matches}</td>
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

  const previewPlayers = h2hTimespanArray.slice(0, 10);

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="text-lg font-bold mb-4">H2H Timespan</h2>
      {renderTable(previewPlayers)}
      {h2hTimespanArray.length > 10 && (
        <button
          onClick={() => { setModalTitle('H2H Timespan'); setModalPlayers(h2hTimespanArray); setShowModal(true); }}
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
