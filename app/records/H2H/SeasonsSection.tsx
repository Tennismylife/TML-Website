"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import Modal from "@/components/Modal";
import { playerMatchesUrl } from "../nav";

interface SeasonsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  parentShowModal?: boolean;
  fetchRequestId?: string | null;
  initialData?: H2HSeasonRecord[];
  description?: string;
}

interface H2HSeasonRecord {
  player1: { id: string; name: string; ioc: string };
  player2: { id: string; name: string; ioc: string };
  year: number;
  matches_played: number;
}

const previewLimit = 10;

export default function SeasonsSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  fetchEnabled,
  setFetchEnabled,
  parentShowModal,
  fetchRequestId,
  initialData,
  description,
}: SeasonsSectionProps) {
  const [data, setData] = useState<H2HSeasonRecord[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const levelsArr = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  const fetchData = async (limit = 200, force = false) => {
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const params = new URLSearchParams();
      surfacesArr.forEach((s) => params.append("surface", s));
      levelsArr.forEach((l) => params.append("level", l));
      if (selectedRounds) params.set("round", selectedRounds);
      params.set("limit", String(limit));

      const res = await fetch(`/api/records/h2h/seasons?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json?.h2h_season) ? json.h2h_season : [];
      setData(arr);
    } catch (err: any) {
      setError(err?.message || "Unable to load data");
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

  const renderTable = (players: H2HSeasonRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-center">Player 1</th>
            <th className="py-1 text-center">Player 2</th>
            <th className="py-1 text-center">Year</th>
            <th className="py-1 text-center">Matches</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-gray-500">{!hasFetched ? "Select data" : "No data"}</td>
            </tr>
          ) : (
            players.map((p) => (
              <tr key={`${p.player1.id}-${p.player2.id}-${p.year}`} className="border-b">
                <td className="py-1">
                  <Flag ioc={p.player1.ioc} className="w-4 h-3" />
                  <Link href={playerMatchesUrl((p.player1 as any).slug ?? String(p.player1.id))} className="text-blue-700 hover:underline">
                    {p.player1.name}
                  </Link>
                </td>
                <td className="py-1">
                  <Flag ioc={p.player2.ioc} className="w-4 h-3" />
                  <Link href={playerMatchesUrl((p.player2 as any).slug ?? String(p.player2.id))} className="text-blue-700 hover:underline">
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

  const previewPlayers = data.slice(0, previewLimit);

  return (
    <section className="rounded border bg-white p-4">
      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>} 



      {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

      {renderTable(previewPlayers)}
      {data.length > previewLimit && (
        <button
          onClick={() => { setShowModal(true); }}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
        >
          View All
        </button>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="H2H in Same Season">
        {renderTable(data)}
      </Modal>
    </section>
  );
}
