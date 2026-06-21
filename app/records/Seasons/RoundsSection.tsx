'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams, usePathname } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface RoundsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: SeasonRoundRecord[];
}

interface SeasonRoundRecord {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_rounds: number;
}

export default function RoundsSection({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: RoundsSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSeasonRounds, setTopSeasonRounds] = useState<SeasonRoundRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModalRounds, setShowModalRounds] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    if (!selectedRounds) {
      setTopSeasonRounds([]);
        setError('Failed to load records.');
      setLoading(false);
      return;
    }

    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModalRounds || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSeasonRounds(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        query.set('limit', showModalRounds ? '1000' : '100');

        const url = `/api/records/seasons/rounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds')
        const data: SeasonRoundRecord[] = await res.json();
        setTopSeasonRounds(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setTopSeasonRounds([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, fetchRequestId, showModalRounds, initialData, setFetchEnabled]);

  if (!selectedRounds) return <div className="text-center py-8 text-gray-300 text-lg">Please select a round to view results.</div>;
  const hasRows = topSeasonRounds.length > 0;

  const totalPages = Math.ceil(topSeasonRounds.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonRounds.slice(start, start + perPage);

 

  const renderTable = (data: SeasonRoundRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/players/${encodeURIComponent((p as any).slug ?? String(p.player_id))}/season/${p.year}`} className="hover:underline">{p.year}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {error ? (
        <div className="text-center py-8 text-gray-300">Failed to load records.</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {pathname === '/records/most-finals-in-a-single-season' && selectedRounds === 'F' && selectedSurfaces.length === 0 && selectedLevels.length === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list stand two players from two very different kinds of seasons: <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-vilas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span> in <strong className="!text-sky-300">1977</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span> in <strong className="!text-sky-300">1969</strong>.
          </p>
          <p>
            Both reached <strong className="!text-amber-300">21</strong> singles finals in a single season, setting the Open Era benchmark for week-to-week consistency at the very end of tournaments. Their non-Slam final volume was also exceptional, with Vilas reaching <strong className="!text-amber-300">18</strong> finals in "Others" events in 1977 and Laver reaching <strong className="!text-amber-300">17</strong> in 1969, before their Grand Slam finals are added to the season total.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-vilas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span> produced the great endurance version of this record in <strong className="!text-sky-300">1977</strong>. He reached <strong className="!text-amber-300">21</strong> finals, winning 16 titles and losing only five finals across one of the heaviest schedules ever played by an elite player. ATP's 1977 activity page records Vilas at 136-14 with 16 titles, while his Grand Slam season included three major finals: Australian Open, Roland Garros and US Open.
            His 1977 was not just about winning trophies; it was about constantly being there on the final day, across surfaces, continents and calendar phases.
          </p>
          <p>
            Behind them sits <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href="/players/ivan-lendl" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span>, whose <strong className="!text-sky-300">1982</strong> season reached the next tier. Lendl made <strong className="!text-amber-300">20</strong> finals that year, converting most of them into titles during one of the most relentless campaigns of the early 1980s.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><Link href="/players/ilie-nastase" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ilie Nastase</Link></span> also belongs close to the top of this record. His <strong className="!text-sky-300">1973</strong> season combined a huge title count with a heavy final-round presence, reflecting the dense early Open Era calendar when elite players often entered far more events than modern champions would attempt.
          </p>
          <p>
            That is why <strong className="!text-amber-300">21</strong> finals in a single season remains such a difficult record to approach. It is not only about peak level; it is about availability, scheduling, recovery and the ability to turn tournament entries into final Sundays again and again.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModalRounds(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalRounds}
        onClose={() => setShowModalRounds(false)}
        title={`Top ${selectedRounds} Reached in a Single Season`}
      >
        {renderTable(topSeasonRounds)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
