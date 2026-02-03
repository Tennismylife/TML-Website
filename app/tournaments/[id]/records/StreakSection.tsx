'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { playerMatchesUrl } from '../../../records/nav';

export default function StreakSection({ id }: { id: string }) {
  const [streaks, setStreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks that must be stable across renders (avoid defining after early returns)
  const viewLimit = 20;
  const [page, setPage] = useState(1);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  // Ensure the current page resets to 1 whenever the streak list changes
  useEffect(() => { setPage(1); }, [streaks]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/records/streak`);
        if (!res.ok) throw new Error('Failed to fetch streaks');
        const data = await res.json();
        if (!mounted) return;
        setStreaks(data.streaks || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Unknown error');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-4">Loading streaks…</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;
  if (!streaks || streaks.length === 0) return <div className="p-4 text-gray-300">No streaks found.</div>;

  // Flatten players->streaks into a single list where each streak becomes its own row
  const flattened = streaks.flatMap((p: any) => (p.streaks || []).map((st: any, idx: number) => ({
    key: `${p.id}-${idx}`,
    playerId: p.id,
    name: p.name,
    slug: p.slug,
    ioc: p.ioc,
    length: st.length,
    match_ids: st.match_ids || [],
    startDate: st.startDate,
    endDate: st.endDate,
  })));

  // Sort by streak length descending (largest streaks first), then by player name
  const flattenedSorted = flattened.slice().sort((a, b) => (b.length - a.length) || (a.name || '').localeCompare(b.name || ''));

  const totalPages = Math.max(1, Math.ceil(flattenedSorted.length / viewLimit));
  const currentData = flattenedSorted.slice((page - 1) * viewLimit, (page - 1) * viewLimit + viewLimit);

  const openMatchesModal = async (matchIds: number[]) => {
    setShowMatchesModal(true);
    setMatches([]);
    setMatchesError(null);
    setMatchesLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/records/streak/streakwins?ids=${matchIds.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatches(data);
    } catch (e: any) {
      setMatchesError(e?.message || 'Error while loading matches.');
    } finally {
      setMatchesLoading(false);
    }
  };

  const renderTable = (list: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Streak</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">No data available.</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr key={s.key ?? `${s.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <Flag ioc={s.ioc ?? undefined} className="w-4 h-3 inline-block" />
                      <Link href={playerMatchesUrl(s.slug ?? String(s.playerId))} className="text-indigo-300 hover:underline">
                        {s.name || `Player ${s.playerId}`}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.length}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openMatchesModal(s.match_ids || [])}
                      className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-500"
                    >
                      View Matches
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4">
      {renderTable(currentData, (page - 1) * viewLimit)}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal show={showMatchesModal} onClose={() => setShowMatchesModal(false)} title="Matches in Win Streak">
        {matchesLoading ? (
          <div className="py-8 text-center text-gray-300">Loading matches…</div>
        ) : matchesError ? (
          <div className="py-8 text-center text-red-500">{matchesError}</div>
        ) : matches.length === 0 ? (
          <div className="py-8 text-center text-gray-300">No matches found.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Round</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Opponent</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {/* Group matches by edition (tourney name + date) and order each group by round */}
                {(() => {
                  const roundOrder: Record<string, number> = { R128: 0, R64: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6, '1R': 0, '2R': 1, '3R': 2, '4R': 3, Q: 4, S: 5 };

                  const groups: Record<string, { name: string; date: string; items: any[] }> = {};
                  for (const m of matches) {
                    const key = `${m.tourney_name || ''}__${m.tourney_date || ''}`;
                    if (!groups[key]) groups[key] = { name: m.tourney_name || '', date: m.tourney_date || '', items: [] };
                    groups[key].items.push(m);
                  }

                  // Sort groups by date then name
                  const groupEntries = Object.values(groups).sort((a, b) => {
                    const da = a.date ?? '';
                    const db = b.date ?? '';
                    if (da !== db) return String(da).localeCompare(String(db));
                    return String(a.name).localeCompare(String(b.name));
                  });

                  return groupEntries.map((g, gi) => {
                    // Sort matches in this group by round order
                    g.items.sort((a, b) => {
                      const ra = a.round && roundOrder[a.round] !== undefined ? roundOrder[a.round] : 999;
                      const rb = b.round && roundOrder[b.round] !== undefined ? roundOrder[b.round] : 999;
                      if (ra !== rb) return ra - rb;
                      // fallback to date then id
                      const da = a.tourney_date ? String(a.tourney_date) : '';
                      const db = b.tourney_date ? String(b.tourney_date) : '';
                      if (da !== db) return da.localeCompare(db);
                      return (a.id ?? 0) - (b.id ?? 0);
                    });

                    return (
                      <React.Fragment key={`group-${gi}`}>
                        <tr className="bg-gray-900"><td colSpan={5} className="px-4 py-2 font-semibold text-gray-200">{g.name} — {g.date}</td></tr>
                        {g.items.map((m: any, idx: number) => (
                          <tr key={`${m.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                            <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.tourney_date}</td>
                            <td className="border border-white/10 px-4 py-2 text-gray-200">{m.tourney_name}</td>
                            <td className="border border-white/10 px-4 py-2 text-gray-200">{m.round}</td>
                            <td className="border border-white/10 px-4 py-2 text-gray-200 flex items-center gap-2"><Flag ioc={m.loser_ioc ?? undefined} className="w-4 h-3 inline-block" />{m.opponent_name}</td>
                            <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.score}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
