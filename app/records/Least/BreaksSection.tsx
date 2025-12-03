'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface BreaksSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: Set<string>;
}

interface BreakRecord {
  player: { id: string; name: string; ioc: string };
  breaksSuffered: number;
  tournament: string;
  year: number;
  matches: { opponent: string; date: string; tournament: string; round: string; breaksSuffered: number }[];
}

export default function BreaksSection({ selectedSurfaces, selectedLevels, selectedRounds }: BreaksSectionProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalMatches, setSubModalMatches] = useState<BreakRecord['matches']>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    selectedRounds.forEach(r => query.append('round', r));
    const url = `/api/records/least/breaks${query.toString() ? '?' + query.toString() : ''}`;

    fetch(url)
      .then(res => res.json())
      .then((data) => setData(data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  const { records: breaksArray } = data || {};

  const SubModal = ({ show, onClose, matches }: { show: boolean; onClose: () => void; matches: BreakRecord['matches'] }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white p-4 w-full max-w-4xl max-h-screen overflow-y-auto rounded" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4">Matches</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Opponent</th>
                <th className="text-left py-1">Date</th>
                <th className="text-left py-1">Year</th>
                <th className="text-left py-1">Tournament</th>
                <th className="text-left py-1">Round</th>
                <th className="text-left py-1">Breaks Suffered</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, index) => (
                <tr key={index} className="border-b">
                  <td className="py-1">{m.opponent}</td>
                  <td className="py-1">{new Date(m.date).toISOString().slice(0, 10)}</td>
                  <td className="py-1">{new Date(m.date).getFullYear()}</td>
                  <td className="py-1">{m.tournament}</td>
                  <td className="py-1">{m.round}</td>
                  <td className="py-1">{m.breaksSuffered}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Close</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Breaks Suffered to Win a Title</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Player</th>
            <th className="text-left py-1">Breaks Suffered</th>
            <th className="text-left py-1">Tournament</th>
            <th className="text-left py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {breaksArray && breaksArray.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-gray-500">No data</td>
            </tr>
          ) : (
            breaksArray && breaksArray.map((p: BreakRecord, index: number) => (
              <tr key={index} className="border-b">
                <td className="py-1">
                  <span className="text-base mr-1">{flagEmoji(iocToIso2(p.player.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(String(p.player.id))}`} className="text-blue-700 hover:underline">
                    {p.player.name}
                  </Link>
                </td>
                <td className="py-1">{p.breaksSuffered}</td>
                <td className="py-1">{p.tournament} ({p.year})</td>
                <td className="py-1">
                  <button
                    onClick={() => { setSubModalMatches(p.matches); setShowSubModal(true); }}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    View Matches
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <SubModal show={showSubModal} onClose={() => setShowSubModal(false)} matches={subModalMatches} />
    </div>
  );
}
