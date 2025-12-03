
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import Pagination from '../../../components/Pagination';
import NthInput from './NthInput'; // ✅ Import del componente

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface Player {
  player_id: string;
  player_name: string;
  ioc: string;
  titles: number;
  tournaments_played: number;
}

export default function TitlesSection({ selectedSurfaces, selectedLevels }: TitlesSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [titleInput, setTitleInput] = useState(1);
  const [maxTitle, setMaxTitle] = useState(1);
  const perPage = 10;

  useEffect(() => { setPage(1); }, [selectedSurfaces, selectedLevels, maxTitle]);
  useEffect(() => { fetchPlayers(); }, [selectedSurfaces, selectedLevels, maxTitle]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('level', l));
      query.append('maxTitles', maxTitle.toString());

      const res = await fetch(`/api/records/neededto/titles?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch titles');
      const data: Player[] = await res.json();
      setPlayers(data.sort((a, b) => (a.tournaments_played ?? 0) - (b.tournaments_played ?? 0)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(players.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = showAll ? players : players.slice(start, start + perPage);

  const renderTable = (data: Player[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Title N</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Tournaments Played</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = showAll ? idx + 1 : start + idx + 1;
            return (
              <tr key={p.player_id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={`/players/${encodeURIComponent(p.player_id)}`} className="text-indigo-300 hover:underline">
                    {p.player_name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.tournaments_played ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (players.length === 0) return <div className="text-center py-8 text-gray-300">No data available</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Tournaments Played to Reach Title N</h2>

      {/* ✅ Barra sopra la tabella */}
      <div className="mb-4 flex justify-between items-center">
        {/* A sinistra: NthInput + Apply */}
        <div className="flex items-center gap-2">
          <NthInput
            label="Title Number (N)"
            value={titleInput}
            onChange={setTitleInput}
            min={1}
            variant="gray"
          />
          <button
            onClick={() => setMaxTitle(titleInput)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Apply
          </button>
        </div>

        {/* A destra: Show All */}
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

      {renderTable(currentData)}

      {!showAll && totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
