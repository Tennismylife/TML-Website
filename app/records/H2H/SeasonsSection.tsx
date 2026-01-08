'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal";

interface SeasonsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  parentShowModal?: boolean;
  fetchRequestId?: string;
  description?: string;
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

export default function SeasonsSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  fetchEnabled,
  parentShowModal,
  fetchRequestId,
  description,
}: SeasonsSectionProps) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<H2HSeasonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlayers, setModalPlayers] = useState<H2HSeasonRecord[]>([]);

  useEffect(() => {
    console.debug('[SeasonsSection] effect start', { enabled, showModal, parentShowModal });
    if (!enabled && !showModal && !parentShowModal) {
      console.debug('[SeasonsSection] skipped fetch: not enabled and no modal');
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Costruisco l'URL senza filtro per anno
    const url = '/api/records/h2h/seasons';
    console.debug('[SeasonsSection] fetching', url);

    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, showModal, parentShowModal]);

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
                  <span className="text-base mr-1">{getFlagFromIOC(p.player1.ioc) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player1.id)}`} className="text-white hover:underline">
                    {p.player1.name}
                  </Link>
                </td>
                <td className="py-1">
                  <span className="text-base mr-1">{getFlagFromIOC(p.player2.ioc) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player2.id)}`} className="text-white hover:underline">
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

  const previewPlayers = h2hSeasonArray.slice(0, 10);

  return (
    <section className="rounded border bg-white p-4">
      {description && <div className="text-center text-4xl font-bold text-white mb-6">{description}</div>}
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
