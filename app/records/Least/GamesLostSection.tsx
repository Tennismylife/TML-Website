'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface GamesLostSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
}

interface GamesLostRecord {
  player: { id: string; name: string; ioc: string };
  gamesLost: number;
  tournament: string;
  year: number;
  date: string;
}

export default function GamesLostSection({ selectedSurfaces, selectedLevels }: GamesLostSectionProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRecords, setModalRecords] = useState<GamesLostRecord[]>([]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    const url = `/api/records/least/gameslost${query.toString() ? '?' + query.toString() : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  const recordsArray = data?.records || [];

  const renderTable = (records: GamesLostRecord[]) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1">Player</th>
          <th className="text-left py-1">Games Lost</th>
          <th className="text-left py-1">Tournament</th>
          <th className="text-left py-1">Year</th>
        </tr>
      </thead>
      <tbody>
        {records.length === 0 ? (
          <tr>
            <td colSpan={4} className="py-2 text-gray-500">No data</td>
          </tr>
        ) : (
          records.map((r, index) => (
            <tr key={index} className="border-b">
              <td className="py-1">
                <span className="text-base mr-1">{flagEmoji(iocToIso2(r.player.ioc)) || ""}</span>
                <Link href={`/players/${encodeURIComponent(String(r.player.id))}`} className="text-blue-700 hover:underline">
                  {r.player.name}
                </Link>
              </td>
              <td className="py-1">{r.gamesLost}</td>
              <td className="py-1">{r.tournament}</td>
              <td className="py-1">{r.year}</td>
            </tr>
          ))
        )}
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
      <h2 className="text-lg font-bold mb-4">Least Games Lost to Win Title</h2>
      {renderTable(recordsArray.slice(0, 10))}
      {recordsArray.length > 10 && (
        <button
          onClick={() => { setModalTitle('Least Games Lost to Win Title'); setModalRecords(recordsArray); setShowModal(true); }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          View All
        </button>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={modalTitle}>
        {renderTable(modalRecords)}
      </Modal>
    </section>
  );
}