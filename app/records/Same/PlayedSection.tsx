'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTourneyHref } from "@/lib/utils";
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { useSearchParams } from 'next/navigation';

interface PlayedSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  description?: string;
}

interface PlayedRecord {
  tourney_id: string;
  tourney_name: string;
  player_id: number;
  player_name: string;
  total_matches: number;
  ioc: string;
}

export default function PlayedSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: PlayedSectionProps & { fetchRequestId?: string | null; initialData?: PlayedRecord[] }) {
  const enabled = !!fetchEnabled;
  const [allPlayed, setAllPlayed] = useState<PlayedRecord[]>(Array.isArray(initialData) ? initialData : []);
  // Show loading immediately when SSR didn't provide any data (prefetch failed or returned empty)
  const [loading, setLoading] = useState(!initialData?.length);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // Trigger client fetch on mount when SSR provided `initialData` so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0) || !initialData?.length;
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setAllPlayed(initialData);
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
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
        query.set('limit', showModal ? '1000' : '100');
        const url = `/api/records/same/played?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch played');
        const data: PlayedRecord[] = await res.json();
        setAllPlayed(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setAllPlayed([]);
        setError('Failed to load records.');
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  const hasRows = allPlayed.length > 0;

  const totalPages = Math.ceil(allPlayed.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allPlayed.slice(start, start + perPage);
  const isMostMatchesPlayedAtSingleTournament = description === 'Most Matches Played at Single Tournament';
  const isMostMatchesPlayedAtSingleGrandSlamTournament = description === 'Most Matches Played at Single Grand Slam Tournament';
  const isMostMatchesPlayedAtSingleMasters1000Tournament = description === 'Most Matches Played at Single Masters 1000 Tournament';

 
  const renderTable = (data: PlayedRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Played</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.tourney_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">
                    {p.player_name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_matches}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={getTourneyHref({ slug: (p as any).tourney_slug ?? undefined, id: p.tourney_id, name: p.tourney_name })} className="hover:underline">{p.tourney_name}</Link>
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

      {isMostMatchesPlayedAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Matches Played at a Single Tournament now stands 🇷🇸 Novak Djokovic, who has reached <strong className="!text-amber-300">121</strong> matches at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>. That is the new ceiling for the category and the clearest sign of how long Djokovic has kept returning to Paris at the highest level.
          </p>
          <p>
            Behind him comes 🇨🇭 Roger Federer at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, with <strong className="!text-amber-300">119</strong> matches played and a <strong className="!text-amber-300">105-14</strong> record at the All England Club. Federer’s Wimbledon total had been the long-standing reference point for this record, built across 8 titles, 12 finals, and appearances from his debut in 1999 through his final Grand Slam match in 2021, while he also reached <strong className="!text-amber-300">117</strong> matches played at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>.
          </p>
          <p>
            The rest of the top tier is made up of the sport’s other great single-event endurance marks: 🇪🇸 Rafael Nadal at Roland Garros with <strong className="!text-amber-300">116</strong> matches and a staggering <strong className="!text-amber-300">112-4</strong> record, 🇷🇸 Djokovic at Wimbledon with <strong className="!text-amber-300">115</strong> matches, and 🇺🇸 Jimmy Connors at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> with <strong className="!text-amber-300">115</strong> matches and a <strong className="!text-amber-300">98-17</strong> record from 1970 to 1992. Djokovic also sits in the same range at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, where he has played <strong className="!text-amber-300">115</strong> matches.
          </p>
          <p>
            A separate non-Slam ATP reference point is Federer again at <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link>, where he owns the highest match total at a regular ATP Tour event outside the majors, with <strong className="!text-amber-300">84</strong> matches played at the <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Swiss Indoors</Link> and a record 10 titles at his hometown tournament. In this record, the milestone is not simply winning the most matches, but repeatedly returning to the same event and adding up matches played across eras: Djokovic now sets the ceiling at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> with <strong className="!text-amber-300">121</strong>, Federer’s Wimbledon benchmark still stands at <strong className="!text-amber-300">119</strong>, and Nadal, Connors and Djokovic all remain part of the same all-time conversation across the majors.
          </p>
        </div>
      )}

      {isMostMatchesPlayedAtSingleGrandSlamTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Matches Played at a Single Grand Slam Tournament now stands 🇷🇸 Novak Djokovic, who has reached <strong className="!text-amber-300">121</strong> matches at Roland Garros. That puts him ahead of Federer’s Wimbledon benchmark and gives Roland Garros the new ceiling in the major-by-major longevity race.
          </p>
          <p>
            Behind him is 🇨🇭 Roger Federer at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, with <strong className="!text-amber-300">119</strong> matches played and a 105-14 record. That had long been the benchmark for this record, built across 22 Wimbledon appearances, 8 titles and 12 finals. Another key line in the same ranking is Federer at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, with <strong className="!text-amber-300">117</strong> matches played.
          </p>
          <p>
            Another major benchmark is 🇪🇸 Rafael Nadal at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, with <strong className="!text-amber-300">116</strong> matches played from a staggering 112-4 record. Nadal’s total is slightly below Federer’s Wimbledon volume, but his Paris résumé is unmatched for dominance: 14 Roland Garros titles, a 96.5/96.6% win rate, and only four defeats across 19 editions.
          </p>
          <p>
            A classic Open Era reference point is 🇺🇸 Jimmy Connors at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, where he played <strong className="!text-amber-300">115</strong> matches, built from a 98-17 record. Connors’ case is the old-school longevity model: five US Open titles, appearances across the 1970s, 1980s and early 1990s, and one of the longest single-major careers in men’s tennis history.
          </p>
          <p>
            In this record, the milestone is not simply winning the most matches, but accumulating the greatest total of matches played at one Slam: Djokovic now sets the ceiling at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> with <strong className="!text-amber-300">121</strong>, Federer’s Wimbledon mark remains at <strong className="!text-amber-300">119</strong>, and the rest of the list is still anchored by Federer at <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> with <strong className="!text-amber-300">117</strong>, Nadal at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> with <strong className="!text-amber-300">116</strong>, and Connors at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> with <strong className="!text-amber-300">115</strong>.
          </p>
        </div>
      )}

      {isMostMatchesPlayedAtSingleMasters1000Tournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Most Matches Played at a Single Masters 1000 Tournament stands 🇷🇸 Novak Djokovic at the <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link>, where he played <strong className="!text-amber-300">81</strong> matches.
          </p>
          <p>
            A parallel benchmark is 🇨🇭 Roger Federer at <Link href={getTourneyHref({ slug: 'indian-wells' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, where he also played <strong className="!text-amber-300">79</strong> matches, finishing with a 66-13 record. Federer’s Indian Wells record included 5 titles and 18 appearances, and ATP noted that his 66 wins there were his most at any Masters 1000 event.
          </p>
          <p>
            Another key benchmark in this list is 🇪🇸 Rafael Nadal at the <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link>, where he sits just behind with <strong className="!text-amber-300">79</strong> matches played; Nadal is also listed at <strong className="!text-amber-300">79</strong> at the <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo Masters</Link>.
          </p>
          <p>
            In this record, the milestone is not simply winning the most matches, but accumulating the greatest total of wins plus losses at one Masters 1000 event: Djokovic now sets the ceiling at the <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> with <strong className="!text-amber-300">81</strong>, while Nadal appears with <strong className="!text-amber-300">79</strong> at both the <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> and the <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo Masters</Link>, and Federer at <Link href={getTourneyHref({ slug: 'indian-wells' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link> is also at <strong className="!text-amber-300">79</strong>.
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Matches Played in the Same Tournament">
        {renderTable(allPlayed)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
