'use client';

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import { getFlagFromIOC, toOrdinal } from "@/lib/utils";
import { playerMatchesUrl } from "../nav";

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  description?: string;
}

interface Player {
  id: string;
  name: string;
  ioc?: string;
  age_nth_round: string; // già formattata XXy YYd
}

function NInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      className="w-24 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export default function RoundSection({ selectedSurfaces, selectedRounds, selectedLevels, fetchEnabled, description }: RoundSectionProps) {
  const [data, setData] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [inputN, setInputN] = useState(1);
  const [selectedN, setSelectedN] = useState(1);
  // allow parent to know applied nth
  const [appliedNth, setAppliedNth] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const perPage = 20;

  // --- Funzione per convertire età decimale in XXy YYd ---
  const formatAge = (ageDecimal: number | string | null) => {
    if (ageDecimal == null) return "-";
    const ageNum = typeof ageDecimal === "string" ? parseFloat(ageDecimal) : ageDecimal;
    const years = Math.floor(ageNum);
    const days = Math.floor((ageNum - years) * 365.25);
    return `${years}y ${days}d`;
  };

  const enabled = !!fetchEnabled;

  const fetchData = async (n: number) => {
    if (!enabled && !showModal) return;
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append("n", n.toString());
      selectedSurfaces.forEach((s) => query.append("surface", s));
      selectedLevels.forEach((l) => query.append("level", l));
      if (selectedRounds) query.append("round", selectedRounds);

      const res = await fetch(`/api/records/ageofnth/rounds?${query.toString()}`);
      const fetchedData = await res.json();

      // Formatta età in XXy YYd
      const formattedData = Array.isArray(fetchedData)
        ? fetchedData.map((p: any) => ({
            ...p,
            age_nth_round: formatAge(p.age_nth_round),
          }))
        : [];

      setData(formattedData);
      setPage(1);
      setSelectedN(n);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const totalCount = Array.isArray(data) ? data.length : 0;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const playersPage = Array.isArray(data) ? data.slice(start, start + perPage) : [];

  const getPlayerLink = (playerId: string) => {
    let link = playerMatchesUrl(playerId);
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              {selectedRounds ? `Age of ${toOrdinal(selectedN)} ${selectedRounds}` : `Age of ${toOrdinal(selectedN)} Round`}
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {globalRank}
                </td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={getPlayerLink(p.id)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {p.age_nth_round || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const levelNames: Record<string, string> = {
    G: "Slams",
    M: "Masters 1000",
    F: "ATP Finals",
    "500": "500",
    "250": "250",
    A: "Others",
    D: "Davis Cup",
  };

  const filters: string[] = [];
  if (selectedLevels && selectedLevels.size > 0) {
    const levels = Array.from(selectedLevels).map(l => levelNames[l] || l);
    filters.push(`in ${levels.join(' or ')}`);
  }
  if (selectedSurfaces && selectedSurfaces.size > 0) {
    const surfaces = Array.from(selectedSurfaces).map(s => s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? (selectedRounds ? `Age of ${toOrdinal(selectedN)} ${selectedRounds}${filterText}` : `Age of ${toOrdinal(selectedN)} Round${filterText}`) : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && <div className="text-center text-4xl font-bold text-white mb-6">{headerText}</div>} 

      <div className="mb-4 flex items-center gap-2">
        <NInput value={inputN} onChange={setInputN} />
        <button
          onClick={() => Number.isFinite(inputN) && fetchData(inputN)}
          disabled={loading || !Number.isFinite(inputN) || inputN <= 0}
          className={`px-4 py-1 rounded ${
            loading || !Number.isFinite(inputN) || inputN <= 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Apply
        </button>
      </div>

      {playersPage.length > perPage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-300">Loading...</div>}
      {error && <div className="text-red-600 text-center py-2">{error}</div>}
      {!loading && !error && playersPage.length === 0 && (
        <div>
          {!hasFetched ? (
            <div className="text-center py-8 text-gray-300">Select data</div>
          ) : (
            <div className="text-center py-8 text-gray-300">No data found.</div>
          )}
        </div>
      )}

      {!loading && playersPage.length > 0 && renderTable(playersPage, start)}

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title={selectedRounds ? `Age of ${toOrdinal(selectedN)} ${selectedRounds}${filterText}` : `Age of ${toOrdinal(selectedN)} Round${filterText}`}>
        {renderTable(data)}
      </Modal>
    </section>
  );
}
