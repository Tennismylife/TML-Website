'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal";

interface SameTournamentSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string; // può essere "All"
  parentShowModal?: boolean;
  fetchRequestId?: string | null;
  description?: string;
}

interface Player {
  id: number | null;
  name: string;
  ioc: string;
}

interface H2HTournamentRecord {
  player1: Player;
  player2: Player;
  tourney_id: string | null;
  tourney_name: string;
  matches_played: number;
}

interface H2HTournamentResponse {
  h2h_tourney: H2HTournamentRecord[];
}

export default function SameTournamentSection({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, fetchRequestId, parentShowModal, description }: SameTournamentSectionProps & { fetchEnabled?: boolean, fetchRequestId?: string | null, parentShowModal?: boolean, description?: string }) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<H2HTournamentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlayers, setModalPlayers] = useState<H2HTournamentRecord[]>([]);

  useEffect(() => {
    console.debug('[SameTournamentSection] effect start', { enabled, showModal, parentShowModal, fetchRequestId });
    const fetchData = async () => {
      if (!((enabled && fetchRequestId) || showModal || parentShowModal)) {
        console.debug('[SameTournamentSection] skipped fetch: not enabled and no modal and no fetchRequestId');
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.append('round', selectedRounds && selectedRounds !== 'All' ? selectedRounds : 'All');

        const url = `/api/records/h2h/sametournament?${query.toString()}`;
        console.debug('[SameTournamentSection] fetching', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const json: H2HTournamentResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, showModal, parentShowModal, fetchRequestId]);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  const h2hTournamentArray = data?.h2h_tourney || [];

  const renderTable = (players: H2HTournamentRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Player 1</th>
            <th className="text-left py-1">Player 2</th>
            <th className="text-left py-1">Tournament</th>
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
              <tr key={`${p.player1.id}-${p.player2.id}-${p.tourney_id}`} className="border-b">
                <td className="py-1">
                  <span className="text-base mr-1">{getFlagFromIOC(p.player1.ioc) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player1.id ?? '')}`} className="text-blue-700 hover:underline">
                    {p.player1.name}
                  </Link>
                </td>
                <td className="py-1">
                  <span className="text-base mr-1">{getFlagFromIOC(p.player2.ioc) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(p.player2.id ?? '')}`} className="text-blue-700 hover:underline">
                    {p.player2.name}
                  </Link>
                </td>
                <td className="py-1">{p.tourney_name}</td>
                <td className="py-1">{p.matches_played}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const previewPlayers = h2hTournamentArray.slice(0, 10);

  return (
    <section className="rounded border bg-white p-4">
      {description && <div className="text-center text-4xl font-bold text-white mb-6">{description}</div>}
      {renderTable(previewPlayers)}
      {h2hTournamentArray.length > 10 && (
        <button
          onClick={() => { setModalTitle('H2H in Same Tournament'); setModalPlayers(h2hTournamentArray); setShowModal(true); }}
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
