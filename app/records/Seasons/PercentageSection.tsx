'use client'

import { useState, useEffect, useRef } from 'react';
import Flag from '@/components/Flag';
import Link from 'next/link';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface PercentageSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: PercentageRecord[];
}

type PercentageRecord = {
  Player: string;
  PlayerId: string | number;
  ioc: string | null;
  Percentage: string;
  Wins: number;
  Total: number;
  Year: number;
};

export default function PercentageSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: PercentageSectionProps) {
  const enabled = !!fetchEnabled;
  const [seasonPercentageData, setSeasonPercentageData] = useState<PercentageRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  // Reusable fetch function so we can attempt a one-time retry when the
  // component mounts with no data (defensive fix so UI doesn't stay empty).
  const lastRequestRefLocal = lastRequestRef; // keep name used below
  const doFetch = async (forceLimit?: number) => {
    setLoading(true);
      setError(null);
    try {
      const query = new URLSearchParams();
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('tourney_level', l));
      if (selectedRounds) query.append('round', selectedRounds);
      if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
      query.set('limit', String(typeof forceLimit === 'number' ? forceLimit : (showModal ? 1000 : 100)));

      const url = `/api/records/seasons/percentage?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch season percentage');

      const data: PercentageRecord[] = await res.json();
      setSeasonPercentageData(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.error(err);
      if (!Array.isArray(initialData) || initialData.length === 0) {
        setSeasonPercentageData([]);
        setError('Failed to load records.');
      }
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRefLocal.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setSeasonPercentageData(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRefLocal.current = fetchRequestId;
    doFetch();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  // Defensive one-time retry: if after mount we still have no data, attempt
  // a single client fetch (covers cases where SSR prefetch returned empty and
  // for some reason `fetchEnabled` was not true). This prevents the page from
  // permanently displaying "No data".
  const attemptedRetryRef = useRef(false);
  useEffect(() => {
    if (attemptedRetryRef.current) return;
    if (loading) return;
    if (Array.isArray(seasonPercentageData) && seasonPercentageData.length === 0) {
      attemptedRetryRef.current = true;
      doFetch();
    }
  }, [loading, seasonPercentageData]);

  const hasRows = seasonPercentageData.length > 0;

  const totalPages = Math.ceil(seasonPercentageData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = seasonPercentageData.slice(start, start + perPage);
  const isBestWinPercentageInSingleSeason = description === 'Best Win Percentage in Single Season';
  const topWinPercentageSeason = isBestWinPercentageInSingleSeason ? seasonPercentageData[0] : undefined;

 
  const renderTable = (data: PercentageRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Percentage</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Total</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${player.Player}-${player.Year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {player.ioc ? <Flag ioc={player.ioc} className="w-4 h-3" /> : <span className="text-base">🏳️</span>}
                  <Link href={playerSurfaceOrMatchesUrl((player as any).slug ?? String(player.PlayerId), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">
                    {player.Player}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Percentage}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Total}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/players/${encodeURIComponent((player as any).slug ?? String(player.PlayerId))}/season/${player.Year}`} className="hover:underline">{player.Year}</Link>
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

      {isBestWinPercentageInSingleSeason && topWinPercentageSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Best Win Percentage in Single Season ranks the most efficient men's tennis seasons of the Open Era, focusing on players who combined a full schedule with an exceptional match-winning rate. This record is about more than a short unbeaten run: it rewards seasons where dominance held up across months of tour-level matches, major events and repeated pressure.
          </p>
          <p>
            At the top of the list stands <span className="inline-flex items-center gap-2">{topWinPercentageSeason.ioc && <Flag ioc={topWinPercentageSeason.ioc} className="w-4 h-3" />}{topWinPercentageSeason.Player}</span>, whose <strong className="!text-sky-300">{topWinPercentageSeason.Year}</strong> season remains the highest single-season winning percentage of the Open Era. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/john-mcenroe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span> finished the year with an extraordinary <strong className="!text-amber-300">82-3</strong> record, winning <strong className="!text-amber-300">96.47%</strong> of his matches. What makes McEnroe's <strong className="!text-sky-300">1984</strong> so difficult to match is that the percentage was built over a real, full season and not a reduced sample. He played <strong className="!text-orange-300">85</strong> matches, reached finals almost everywhere, and lost only three times all year. His season included titles at Wimbledon and the US Open, plus a run to the Roland Garros final, where one of those three defeats came against Ivan Lendl after McEnroe had led by two sets.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, whose <strong className="!text-sky-300">1974</strong> season produced the second-best winning percentage in the Open Era. Connors went <strong className="!text-amber-300">94-4</strong>, winning <strong className="!text-amber-300">95.92%</strong> of his matches. Connors' 1974 was also one of the great major-winning years: he won the Australian Open, Wimbledon and the US Open, turning dominance into both volume and efficiency.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> came closest in the modern era. In <strong className="!text-sky-300">2005</strong>, Federer finished <strong className="!text-amber-300">81-4</strong>, a <strong className="!text-amber-300">95.29%</strong> winning percentage. He also appears again with his <strong className="!text-sky-300">2006</strong> season, when he went <strong className="!text-amber-300">92-5</strong>, winning <strong className="!text-amber-300">94.85%</strong> of his matches.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Bjorn Borg</Link></span> follows with his <strong className="!text-sky-300">1979</strong> season, finishing <strong className="!text-amber-300">84-6</strong> for a <strong className="!text-amber-300">93.33%</strong> win rate.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> produced his best season by percentage in <strong className="!text-sky-300">2015</strong>, going <strong className="!text-amber-300">82-6</strong> for <strong className="!text-amber-300">93.18%</strong>. That season was built on total control of the elite calendar: three Grand Slam titles, six Masters 1000 titles and the ATP Finals.
          </p>
          <p>
            That is why McEnroe's <strong className="!text-amber-300">96.47%</strong> in <strong className="!text-sky-300">1984</strong> remains the benchmark. Connors, Federer, Borg and Djokovic all came close, but none matched the same combination of volume and near-perfection.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Top Win Percentage in a Single Season"
      >
        {renderTable(seasonPercentageData)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
