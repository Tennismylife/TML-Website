'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { formatAgeDisplay } from './ageUtils';
import Pagination from '../../../components/Pagination';
import NthInput from './NthInput';

interface EntriesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface PlayerInfo {
  id: string;
  name: string;
  ioc: string;
  ageEntries: number[];
}

interface RowData {
  id: string;
  name: string;
  ioc: string;
  age: number;
}

export default function EntriesSection({
  selectedSurfaces,
  selectedLevels,
}: EntriesSectionProps) {
  const [data, setData] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedN, setSelectedN] = useState(1);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const perPage = 10;

  // Reset pagina quando cambiano filtri o N
  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedN]);

  // Fetch dati + adattamento struttura API → PlayerInfo[]
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();

    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));

    const url = `/api/records/ageofnth/entries?${query.toString()}`;
    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((apiData: any[]) => {
        const adapted: PlayerInfo[] = apiData.map(d => {
          const ageEntries: number[] = [];
          const entries = Object.entries(d.ages?.ages_json || {}).map(
            ([age, cum]) => [parseFloat(age), cum as number]
          );
          entries.sort((a, b) => a[0] - b[0]);

          let prev = 0;
          for (const [age, cumulative] of entries) {
            const diff = cumulative - prev;
            for (let i = 0; i < diff; i++) ageEntries.push(age);
            prev = cumulative;
          }

          return {
            id: d.id.toString(),
            name: d.name,
            ioc: d.ioc,
            ageEntries,
          };
        });

        setData(adapted);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels]);

  // Costruzione tabella per l’Nth entry
  const filteredData = useMemo(() => {
    const result: RowData[] = [];

    for (const player of data) {
      const sortedAges = [...player.ageEntries].sort((a, b) => a - b);
      if (sortedAges.length >= selectedN) {
        const age = sortedAges[selectedN - 1];
        result.push({
          id: player.id,
          name: player.name,
          ioc: player.ioc,
          age,
        });
      }
    }

    return result.sort((a, b) => a.age - b.age);
  }, [data, selectedN]);

  // Paginazione
  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const start = (page - 1) * perPage;
  const end = start + perPage;

  const currentData = useMemo(
    () => (showAll ? filteredData : filteredData.slice(start, end)),
    [filteredData, showAll, start, end]
  );

  const formatAgeYearsDays = useCallback((age: number) => formatAgeDisplay(age), []);

  const renderTable = useCallback(
    (rows: RowData[], startIndex = 0) => (
      <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
              <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
              <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => {
              const rank = startIndex + idx + 1;
              return (
                <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                  <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                    <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                    <Link
                      href={`/players/${encodeURIComponent(p.id)}`}
                      className="text-indigo-300 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-gray-200">
                    {formatAgeYearsDays(p.age)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ),
    [formatAgeYearsDays]
  );

  // Stato UI
  if (error) return <div className="text-red-600">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Age at Nth Entry</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            const newShowAll = !showAll;
            setShowAll(newShowAll);
            if (!newShowAll) setPage(1);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? 'Show Paginated' : 'Show All'}
        </button>
      </div>

      <NthInput
        label="Nth Entry:"
        value={selectedN}
        onChange={(v) => setSelectedN(Math.max(1, Number(v) || 1))}
        min={1}
      />

      {filteredData.length === 0 ? (
        <p className="text-center py-8 text-gray-300">No data available for this N.</p>
      ) : (
        renderTable(currentData, showAll ? 0 : start)
      )}

      {!showAll && filteredData.length > perPage && (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
