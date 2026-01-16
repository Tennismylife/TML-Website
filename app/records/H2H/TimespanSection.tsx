"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import Modal from "@/components/Modal";
import { playerMatchesUrl } from "../nav";

interface TimespanSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  parentShowModal?: boolean;
  fetchRequestId?: string | null;
  initialData?: H2HTimespanRecord[];
  description?: string;
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

const previewLimit = 10;

export default function TimespanSection({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, setFetchEnabled, parentShowModal, fetchRequestId, initialData, description }: TimespanSectionProps) {
  const [data, setData] = useState<H2HTimespanRecord[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const levelsArr = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  const fetchData = async (limit = 50, force = false) => {
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const query = new URLSearchParams();
      surfacesArr.forEach(s => query.append('surface', s));
      levelsArr.forEach(l => query.append('level', l));
      if (selectedRounds && selectedRounds !== 'All') query.append('round', selectedRounds);
      query.append('limit', String(limit));

      const url = `/api/records/h2h/timespan${query.toString() ? '?' + query.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json?.h2hTimespans) ? json.h2hTimespans : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load data');
      setData([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
      if (fetchEnabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRequestId, surfacesArr.join(','), levelsArr.join(','), selectedRounds]);

  const renderTable = (players: H2HTimespanRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Player 1</th>
            <th className="py-1 text-left">Player 2</th>
            <th className="py-1 text-left">First Match</th>
            <th className="py-1 text-left">First Tournament</th>
            <th className="py-1 text-left">Last Match</th>
            <th className="py-1 text-left">Last Tournament</th>
            <th className="py-1 text-left">Timespan (Days)</th>
            <th className="py-1 text-left">Matches</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-2 text-gray-500">{!hasFetched ? 'Select data' : 'No data'}</td>
            </tr>
          ) : (
            players.map(p => (
              <tr key={`${p.player1.id}-${p.player2.id}`} className="border-b">
                <td className="py-1">
                  {p.player1.ioc && <Flag ioc={p.player1.ioc} className="mr-1 text-base" />}
                  <Link href={playerMatchesUrl(p.player1.id)} className="text-blue-700 hover:underline">
                    {p.player1.name}
                  </Link>
                </td>
                <td className="py-1">
                  {p.player2.ioc && <Flag ioc={p.player2.ioc} className="mr-1 text-base" />}
                  <Link href={playerMatchesUrl(p.player2.id)} className="text-blue-700 hover:underline">
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

  const previewPlayers = data.slice(0, previewLimit);

  return (
    <section className="rounded border bg-white p-4">
      {description && <h1 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h1>}  



      {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

      {renderTable(previewPlayers)}
      {data.length > previewLimit && (
        <button
          onClick={() => setShowModal(true)}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
        >
          View All
        </button>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="H2H Timespan">
        {renderTable(data)}
      </Modal>
    </section>
  );
}
