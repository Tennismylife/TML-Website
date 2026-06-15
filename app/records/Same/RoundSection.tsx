'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { getTourneyHref } from "@/lib/utils";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface SameRoundSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRound: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (enabled: boolean) => void;
  description?: string;
  fetchRequestId?: string | null;
  initialData?: RoundEntryRecord[];
}

type RoundEntryRecord = {
  tourney_name: string;
  player_id: string;
  player_name: string;
  total_rounds: number;
  ioc: string | null;
};

export default function SameRoundSection({ selectedSurfaces, selectedLevels, selectedRound, fetchEnabled, setFetchEnabled, description, fetchRequestId, initialData }: SameRoundSectionProps) {
  const enabled = !!fetchEnabled;
  const [entries, setEntries] = useState<RoundEntryRecord[]>(Array.isArray(initialData) ? initialData : []);
  // Show loading immediately when SSR didn't provide any data (prefetch failed or was skipped)
  // Show loading immediately when SSR didn't provide any data (prefetch failed or returned empty)
  const [loading, setLoading] = useState(!initialData?.length && !!selectedRound);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRound]);

  useEffect(() => {
    if (!selectedRound) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Trigger client fetch on mount when SSR provided `initialData` so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    // Also trigger when initialData is undefined (SSR prefetch failed or was skipped).
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0) || !initialData?.length;
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setEntries(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRound) query.append('round', selectedRound);
        query.set('limit', showModal ? '1000' : '100');

        const url = `/api/records/same/rounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data: RoundEntryRecord[] = await res.json();
        setEntries(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRound, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  if (!selectedRound) return <div className="text-center py-8 text-gray-300 text-lg">Please select a round to view results.</div>;
  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!entries.length) return <div className="text-center py-8 text-gray-300 text-lg">No players found.</div>;

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = entries.slice(start, start + perPage);
  const isMostQuarterfinalsAtSingleTournament = description === 'Most Quarterfinals at Single Tournament';
  const isMostSemifinalsAtSingleTournament = description === 'Most Semifinals at Single Tournament';
  const isMostFinalsAtSingleTournament = description === 'Most Finals at Single Tournament';

  const renderTable = (data: RoundEntryRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.tourney_name}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {p.ioc && <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />}
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{p.tourney_name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {isMostFinalsAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Finals at a Single Tournament stands 🇨🇭 Roger Federer, who reached the final of <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Swiss Indoors Basel</Link> <strong className="!text-amber-300">15</strong> times — the highest recorded total by a man at one tour-level tournament. Federer contested Basel finals between 2000 and 2019, winning the title 10 times and finishing runner-up 5 times. He also reached <strong className="!text-amber-300">13</strong> finals at <Link href={getTourneyHref({ slug: 'halle' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link>, making it another defining venue in his career. <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link> was Federer’s hometown tournament and one of the defining venues of his career: he won the event in 2006–08, 2010–11, 2014–15 and 2017–19, with his final Basel title in 2019 also becoming his 103rd and last ATP singles title.
          </p>
          <p>
            Behind him, the strongest Grand Slam reference is 🇪🇸 Rafael Nadal at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, where he reached <strong className="!text-amber-300">14</strong> finals and won all 14, the most finals at a single Grand Slam tournament in the Open Era. Guinness records Nadal’s 14 French Open finals and notes that he won every one of them, from 2005–08, 2010–14, 2017–20 and 2022. Nadal also dominates the non-Slam clay-court version of this record: he reached <strong className="!text-amber-300">12</strong> finals at <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, winning 11 titles, and <strong className="!text-amber-300">12</strong> finals at <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, winning 12 titles.
          </p>
          <p>
            In this record, the milestone is not simply winning the most titles, but returning to the same tournament final year after year: Federer set the overall tour-level ceiling with <strong className="!text-amber-300">15</strong> <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link> finals, while Nadal owns the Grand Slam ceiling with <strong className="!text-amber-300">14</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> finals — and did so without losing one.
          </p>
        </div>
      )}

      {isMostQuarterfinalsAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Quarterfinals at a Single Tournament stands 🇨🇭 Roger Federer, who reached the <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> quarterfinals <strong className="!text-amber-300">18</strong> times — the highest men’s total at one tournament. Federer’s Wimbledon quarterfinal streak set the Grand Slam benchmark for repeated last-eight appearances.
          </p>
          <p>
            Behind him, the next single-tournament quarterfinal reference is 🇺🇸 Jimmy Connors at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> with <strong className="!text-amber-300">17</strong> quarterfinals, followed by 🇷🇸 Novak Djokovic with <strong className="!text-amber-300">17</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> quarterfinals and <strong className="!text-amber-300">17</strong> <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> quarterfinals. Those totals show how Djokovic has matched the most elite single-tournament quarterfinal profiles on both clay majors and the Masters 1000 circuit.
          </p>
          <p>
            Another strong non-Slam cluster sits at <strong className="!text-amber-300">16</strong>: Federer at <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel / Swiss Indoors</Link> and <Link href={getTourneyHref({ slug: 'halle' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link>, and Rafael Nadal at <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> and <Link href={getTourneyHref({ slug: 'madrid-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid Masters</Link>. Basel still stands out for Federer because it also includes 15 finals at his hometown tournament.
          </p>
          <p>
            In this record, the milestone is not just winning trophies, but repeatedly surviving to the last eight at the same tournament across many years: Federer set the overall single-tournament ceiling at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> with <strong className="!text-amber-300">18</strong> quarterfinals, Connors holds the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> reference with <strong className="!text-amber-300">17</strong>, Djokovic owns the modern clay and Masters records with <strong className="!text-amber-300">17</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and <strong className="!text-amber-300">17</strong> <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> quarterfinals, while the non-Slam group at <strong className="!text-amber-300">16</strong> includes Basel, Halle, Rome and Madrid.
          </p>
        </div>
      )}

      {isMostSemifinalsAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Semifinals at a Single Tournament stands 🇨🇭 Roger Federer, who reached the semifinals of <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel / Swiss Indoors</Link> <strong className="!text-amber-300">16</strong> times — the highest known men’s singles total at one tour-level event. Federer also reached the semifinals <strong className="!text-amber-300">16</strong> times at the <Link href={getTourneyHref({ slug: 'atp-finals' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>. He reached a record 15 Basel finals and also lost in the 2002 Basel semifinal to 🇦🇷 David Nalbandian, giving him 16 total semifinal-or-better appearances at his hometown tournament.
          </p>
          <p>
            Behind him, the strongest Grand Slam benchmarks are 🇪🇸 Rafael Nadal at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and 🇨🇭 Roger Federer at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, both with <strong className="!text-amber-300">15</strong> semifinals. Nadal went 14-1 in Roland Garros semifinals and ultimately won 14 titles there.
          </p>
          <p>
            Another tour-level reference is 🇨🇭 Roger Federer at <Link href={getTourneyHref({ slug: 'halle' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link>, where he reached the semifinals <strong className="!text-amber-300">15</strong> times, while the Masters 1000 benchmark is <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, where Nadal reached the semifinals <strong className="!text-amber-300">14</strong> times.
          </p>
          <p>
            In this record, the milestone is not simply winning the title, but repeatedly surviving to the final four at the same event: Federer set the overall single-tournament ceiling with <strong className="!text-amber-300">16</strong> <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link> semifinals, Nadal and Federer share the Grand Slam version with <strong className="!text-amber-300">15</strong> semifinals at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, and <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> provides the Masters 1000 benchmark through Nadal.
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

      {!showModal && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={`Top ${selectedRound} Reached in the Same Tournament`}
      >
        {renderTable(entries)}
      </Modal>
    </section>
  );
}
