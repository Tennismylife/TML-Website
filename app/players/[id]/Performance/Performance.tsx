"use client";

import React, { useEffect, useState } from "react";
import type { Match } from "@/types";
import PerformanceFilter from "./PerformanceFilter";
import PieStatChart from "./PieStatChart";
import PerformanceCalculations from "./PerformanceCalculations";

interface PerformanceProps {
  playerId: string;
}

export default function Performance({ playerId }: PerformanceProps) {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filtered, setFiltered] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch dati ---
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players/performance?id=${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (!abort) setAllMatches(data);
      } catch {
        if (!abort) setError("Errore nel caricamento dei match.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [playerId]);

  const { perfRows, surfaceRows, pressureRows } =
    PerformanceCalculations({ filtered, playerId });

  const { setsRows, rankingsRows } = pressureRows;

  return (
    <section className="p-4">
      <PerformanceFilter
        allMatches={allMatches}
        loading={loading}
        error={error}
        onFilteredChange={setFiltered}
      />

      {loading && <div className="text-gray-500">Loading</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* --- LEVELS --- */}
          <div className="border rounded p-4">
            <h3 className="text-center text-2xl font-bold mb-4">Levels</h3>
            <div className="grid grid-cols-2 gap-4">
              {perfRows.map((r) => (
                <div key={r.key} className="text-center">
                  <h4 className="text-sm font-medium mb-2">{r.label}</h4>
                  <PieStatChart W={r.W} L={r.L} />
                </div>
              ))}
            </div>
          </div>

          {/* --- SURFACES --- */}
          <div className="border rounded p-4">
            <h3 className="text-center text-2xl font-bold mb-4">Surfaces</h3>
            <div className="grid grid-cols-2 gap-4">
              {surfaceRows.map((r) => (
                <div key={r.key} className="text-center">
                  <h4 className="text-sm font-medium mb-2">{r.label}</h4>
                  <PieStatChart W={r.W} L={r.L} />
                </div>
              ))}
            </div>
          </div>

          {/* --- SETS --- */}
          <div className="border rounded p-4">
            <h3 className="text-center text-2xl font-bold mb-4">Sets</h3>
            <div className="grid grid-cols-2 gap-4">
              {setsRows.map((r) => (
                <div key={r.key} className="text-center">
                  <h4 className="text-sm font-medium mb-2">{r.label}</h4>
                  <PieStatChart W={r.W} L={r.L} />
                </div>
              ))}
            </div>
          </div>

          {/* --- RANKINGS --- */}
          <div className="border rounded p-4">
            <h3 className="text-center text-2xl font-bold mb-4">Rankings</h3>
            <div className="grid grid-cols-2 gap-4">
              {rankingsRows.map((r) => (
                <div key={r.key} className="text-center">
                  <h4 className="text-sm font-medium mb-2">{r.label}</h4>
                  <PieStatChart W={r.W} L={r.L} />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
