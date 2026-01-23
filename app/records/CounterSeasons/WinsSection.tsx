"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import Flag from '@/components/Flag';
import { getPlayerHref } from "@/lib/utils";

interface WinsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRound?: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  initialData?: Player[];
  initialSeasons?: number;
  description?: string;
}

interface Player {
  id: string;
  name: string;
  ioc: string;
  totalSeasons: number;
  seasonsList: string[];
}

const viewLimit = 20;

export default function WinsSection({
  selectedSurfaces,
  selectedLevels,
  selectedRound,
  selectedBestOf,
  fetchEnabled = true,
  setFetchEnabled,
  fetchRequestId,
  initialData,
  initialSeasons,
  description,
}: WinsSectionProps) {
  const [players, setPlayers] = useState<Player[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(!!initialData);
  const [showModal, setShowModal] = useState(false);
  const [minWinsPerSeason, setMinWinsPerSeason] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const nParam = sp.get('n') ?? sp.get('seasons') ?? sp.get('min');
        const parsed = Number(nParam);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return Math.max(1, initialSeasons || 1);
  });

  // The "applied" value is the value reflected in the page (H1, modal titles, document.title)
  // and only changes when the user presses "Apply" (i.e., when we fetch data).
  const [appliedMinWinsPerSeason, setAppliedMinWinsPerSeason] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const nParam = sp.get('n') ?? sp.get('seasons') ?? sp.get('min');
        const parsed = Number(nParam);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return Math.max(1, initialSeasons || 1);
  });

  const lastRequestIdRef = useRef<string | null>(null);
  const router = useRouter();
  const roundAbbreviations: Record<string, string> = {
    R128: "R128s",
    R64: "R64s",
    R32: "R32s",
    R16: "R16s",
    QF: "QFs",
    SF: "SFs",
    F: "Fs",
  };
  const roundNames: Record<string, string> = {
    R128: "Round of 128",
    R64: "Round of 64",
    R32: "Round of 32",
    R16: "Round of 16",
    QF: "Quarterfinals",
    SF: "Semifinals",
    F: "Finals",
  };

  const getRoundLabel = (code?: string, count?: number) => {
    if (!code) return '';
    const raw = roundNames[code] ?? (roundAbbreviations[code] ?? code);
    const singular = String(raw).endsWith('s') ? String(raw).slice(0, -1) : raw;
    const plural = String(raw).endsWith('s') ? raw : `${raw}s`;
    return count === 1 ? singular : plural;
  };

  const filtersText = useMemo(() => {
    const parts: string[] = [];
    if (selectedLevels.length) parts.push(`in ${selectedLevels.join(" or ")}`);
    if (selectedSurfaces.length) parts.push(`on ${selectedSurfaces.join(" or ")}`);
    // do not include selectedRound in filtersText to avoid duplication with header
    return parts.length ? ` ${parts.join(" ")}` : "";
  }, [selectedLevels, selectedSurfaces]);

  const headerText = selectedRound
    ? `Seasons with at least ${appliedMinWinsPerSeason} ${getRoundLabel(selectedRound, appliedMinWinsPerSeason)}${filtersText}`
    : `Seasons with at least ${appliedMinWinsPerSeason} ${appliedMinWinsPerSeason === 1 ? 'win' : 'wins'}${filtersText}`;

  const fetchPlayers = async (limit = 100, force = false) => {
    if (!fetchEnabled && !force) return;
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const q = new URLSearchParams();
      selectedSurfaces.forEach((s) => q.append("surface", s));
      selectedLevels.forEach((l) => q.append("level", l));
      if (selectedRound) q.append("round", selectedRound);
      if (selectedBestOf) q.append("best_of", String(selectedBestOf));
      q.append("minWinsPerSeason", String(minWinsPerSeason));
      q.append("limit", String(limit));

      const res = await fetch(`/api/records/counterseasons/wins?${q.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Player[] = Array.isArray(data.players) ? data.players : [];
      setPlayers(list);

      // Compute header text for the newly applied value (use minWinsPerSeason directly to avoid stale closures)
      const appliedHeader = selectedRound
        ? `Seasons with at least ${minWinsPerSeason} ${getRoundLabel(selectedRound, minWinsPerSeason)}${filtersText}`
        : `Seasons with at least ${minWinsPerSeason} ${minWinsPerSeason === 1 ? 'win' : 'wins'}${filtersText}`;

      // Apply the selector so the H1 reflects the applied value
      try { setAppliedMinWinsPerSeason(minWinsPerSeason); } catch (e) { /* ignore */ }

      // Update canonical URL and document.title (client-side) to reflect the applied filters.
      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        newQuery.set('n', String(minWinsPerSeason));
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
        selectedLevels.forEach(l => newQuery.append('level', l));
        if (selectedBestOf != null) newQuery.set('bestOf', String(selectedBestOf));
        if (selectedRound) newQuery.set('round', selectedRound);

        const current = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const compareMulti = (a: URLSearchParams, b: URLSearchParams, key: string) => {
          const aa = a.getAll(key).map(String).sort();
          const bb = b.getAll(key).map(String).sort();
          if (aa.length !== bb.length) return false;
          for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
          return true;
        };

        const sameN = current.get('n') === newQuery.get('n');
        const sameSurface = compareMulti(current, newQuery, 'surface');
        const sameLevel = compareMulti(current, newQuery, 'level');
        const sameRound = current.get('round') === newQuery.get('round');
        const sameBestOf = current.get('bestOf') === newQuery.get('bestOf');

        if (!(sameN && sameSurface && sameLevel && sameRound && sameBestOf)) {
          router.replace(`${path}?${newQuery.toString()}`);
        }

        // Update title to reflect applied filters (do not overwrite server SEO titles)
        try {
          const currentTitle = typeof document !== 'undefined' ? document.title || '' : '';
          const currentIsSiteSeo = typeof currentTitle === 'string' && /\| Tennis/.test(currentTitle);
          if (!currentIsSiteSeo && typeof document !== 'undefined') document.title = `${appliedHeader} | Tennis Records`; 
        } catch(e) { /* ignore */ }

      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load data");
      setPlayers([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
      if (setFetchEnabled) setFetchEnabled(false);
    }
  };

  useEffect(() => {
    if (!fetchEnabled) return;
    fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEnabled, fetchRequestId]);

  // Ensure that when the page is loaded directly (e.g., /records/counterseasons/wins?n=7)
  // we pick up the `n` query parameter and apply it so the H1/modal show the correct value.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const nParam = sp.get('n') ?? sp.get('seasons') ?? sp.get('min');
      const parsed = Number(nParam);
      if (Number.isFinite(parsed) && parsed > 0) {
        if (parsed !== minWinsPerSeason) setMinWinsPerSeason(parsed);
        if (parsed !== appliedMinWinsPerSeason) setAppliedMinWinsPerSeason(parsed);
      }
    } catch (e) { /* ignore */ }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Seasons</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">
                {!hasFetched ? "Select data" : "No data found."}
              </td>
            </tr>
          ) : (
            list.map((p, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" /> }
                      <Link href={getPlayerHref((p as any).slug ?? String(p.id))} className="text-indigo-300 hover:underline">
                        {p.name || "Unknown Player"}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.totalSeasons}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">{p.seasonsList.join(", ")}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const topPlayers = players.slice(0, viewLimit);

  return (
    <section className="mb-0">
      {headerText && <h1 className="mb-6 text-center text-2xl font-semibold text-white">{headerText}</h1>} 

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="minWinsPerSeason" className="text-gray-200">
          Min wins per season:
        </label>
        <input
          id="minWinsPerSeason"
          type="number"
          min={1}
          value={minWinsPerSeason}
          onChange={(e) => setMinWinsPerSeason(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-20 rounded border border-white/30 bg-gray-800 px-2 py-1 text-sm text-gray-200"
        />
        <button
          onClick={() => fetchPlayers(100, true)}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-500">Error loading data: {error}</p>}

      <div className="mb-0 flex justify-end">
        {players.length > viewLimit && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            View All
          </button>
        )}
      </div>

      {renderTable(topPlayers, 0)}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={selectedRound ? `Seasons with at least ${appliedMinWinsPerSeason} ${getRoundLabel(selectedRound, appliedMinWinsPerSeason)}${filtersText}` : `Seasons with at least ${appliedMinWinsPerSeason} ${appliedMinWinsPerSeason === 1 ? 'win' : 'wins'}${filtersText}`}
      >
        {renderTable(players, 0)}
      </Modal>
    </section>
  );
}
