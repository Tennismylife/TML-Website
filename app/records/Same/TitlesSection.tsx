'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTourneyHref, getPlayerHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import Flag from '@/components/Flag';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  description?: string;
}

interface TitleRecord {
  player_id: string;
  player_name: string;
  ioc: string;
  total_titles: number;
  tourney_id: string;
  tourney_name: string;
}

export default function TitlesSection({ selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: TitlesSectionProps & { fetchRequestId?: string | null; initialData?: TitleRecord[] }) {
  const enabled = !!fetchEnabled;
  const [allTitles, setAllTitles] = useState<TitleRecord[]>(Array.isArray(initialData) ? initialData : []);
  // Show loading immediately when SSR didn't provide any data (prefetch failed or was skipped)
  // Show loading immediately when SSR didn't provide any data (prefetch failed or returned empty)
  const [loading, setLoading] = useState(!initialData?.length);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    // Trigger client fetch on mount when SSR provided `initialData` so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    // Also trigger when initialData is undefined (SSR prefetch failed or was skipped).
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0) || !initialData?.length;
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setAllTitles(initialData);
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
        query.set('limit', showModal ? '1000' : '100');
        const url = `/api/records/same/titles?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles');
        const data: TitleRecord[] = await res.json();
        setAllTitles(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        if (!Array.isArray(initialData) || initialData.length === 0) {
          setAllTitles([]);
          setError('Failed to load records.');
        }
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  const hasRows = allTitles.length > 0;

  const totalPages = Math.ceil(allTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allTitles.slice(start, start + perPage);
  const isMostTitlesAtSingleTournament = description === 'Most Titles at Single Tournament';
  const isMostTitlesAtSingleGrandSlamTournament = description === 'Most Titles at Single Grand Slam Tournament';
  const isMostTitlesAtSingleMasters1000Tournament = description === 'Most Titles at Single Masters 1000 Tournament';

  const renderPlayerLink = (name: string, slug: string, ioc: string) => (
    <span className="inline-flex items-center gap-2">
      <Flag ioc={ioc} className="w-4 h-3" />
      <Link href={getPlayerHref(slug)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">
        {name}
      </Link>
    </span>
  );

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
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
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_titles}</td>
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

      {isMostTitlesAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Titles at a Single Tournament stands {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')}, who won <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> <strong className="!text-amber-300">14</strong> times — the most singles titles won by any man at one tournament, and the most by any player at a single Grand Slam event. His French Open titles came in 2005–08, 2010–14, 2017–20 and 2022. Nadal’s <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> record is the ultimate single-event dominance case: he went 14-0 in finals, finished with a 112-4 career record in Paris, and won his final title in 2022 by beating {renderPlayerLink('Casper Ruud', 'casper-ruud', 'NOR')} 6-3, 6-3, 6-0.
          </p>
          <p>
            Behind him, Nadal also owns the strongest non-Slam ATP tournament marks: <strong className="!text-amber-300">12</strong> titles at <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <strong className="!text-amber-300">11</strong> titles at <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, and <strong className="!text-amber-300">10</strong> titles at <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>. ATP highlights that Nadal is the only men’s player to reach 10 or more titles at four different tournaments: <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> and <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>.
          </p>
          <p>
            The closest men’s Grand Slam challenger is {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')}, with <strong className="!text-amber-300">10</strong> <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> titles, while {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')} owns the major grass-court benchmark with <strong className="!text-amber-300">8</strong> <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> titles. Nadal’s <strong className="!text-amber-300">14</strong> at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> therefore stands four clear of the next men’s single-major record.
          </p>
          <p>
            A separate regular ATP Tour reference point is {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')}, who won <strong className="!text-amber-300">10</strong> titles at <Link href={getTourneyHref({ slug: 'halle' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link> and <strong className="!text-amber-300">10</strong> at <Link href={getTourneyHref({ slug: 'basel' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link>, giving him the strongest non-clay single-event title profile among modern men’s players. But overall, the ceiling remains Nadal’s <strong className="!text-amber-300">14</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> titles.
          </p>
          <p>
            In this record, the milestone is not simply repeated success, but turning one tournament into a personal empire: {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')} set the all-time Open Era men’s ceiling with <strong className="!text-amber-300">14</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> titles, then reinforced the same dominance model with <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> and <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>.
          </p>
        </div>
      )}

      {isMostTitlesAtSingleGrandSlamTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Titles at a Single Grand Slam Tournament stands {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')}, who won <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> <strong className="!text-amber-300">14</strong> times — the most singles titles won by any man at one Grand Slam event. His French Open titles came in 2005–08, 2010–14, 2017–20 and 2022. Nadal’s <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> record is the ultimate single-major dominance case: he went 14-0 in finals, finished with a 112-4 career record in Paris, and won his final title in 2022 by beating {renderPlayerLink('Casper Ruud', 'casper-ruud', 'NOR')} 6-3, 6-3, 6-0.
          </p>
          <p>
            Behind him comes {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')}, with <strong className="!text-amber-300">10</strong> <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> titles, the second-highest men’s total at a single Grand Slam tournament. ATP highlights that Djokovic is Nadal’s closest challenger in this category, four titles behind Nadal’s <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> benchmark.
          </p>
          <p>
            The next major benchmark is {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')}, who won <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> <strong className="!text-amber-300">8</strong> times, the men’s record at the All England Club. Federer’s <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> total remains the grass-court Grand Slam standard, while Djokovic’s <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> dominance is the hard-court equivalent among men.
          </p>
          <p>
            The gap at the top is therefore clear: Nadal’s <strong className="!text-amber-300">14</strong> titles at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> stand four ahead of Djokovic’s <strong className="!text-amber-300">10</strong> at <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> and six ahead of Federer’s <strong className="!text-amber-300">8</strong> at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, making <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> the highest single-major peak in men’s Open Era history.
          </p>
          <p>
            In this record, the milestone is not simply repeated Slam success, but turning one major into a personal empire: {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')} set the ceiling with <strong className="!text-amber-300">14</strong> <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> titles, with Djokovic and Federer providing the closest hard-court and grass equivalents.
          </p>
        </div>
      )}

      {isMostTitlesAtSingleMasters1000Tournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Titles at a Single Masters 1000 Tournament stands {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')}, who won <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> <strong className="!text-amber-300">11</strong> times — the highest title total by any man at one Masters 1000 event. His <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> titles came in 2005–12 and 2016–18, creating the strongest single-event résumé in Masters history. Nadal’s Monte-Carlo dominance was built on scale and continuity: eight consecutive titles from 2005 to 2012, then three more in his second phase, alongside a 73-6 tournament record and a 46-match winning streak at the event.
          </p>
          <p>
            Behind him comes Nadal again, with <strong className="!text-amber-300">10</strong> titles at <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, the second-highest single-tournament Masters total. That gives him both of the top two men’s single-event marks at Masters 1000 level: <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> at <strong className="!text-amber-300">11</strong> and <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> at <strong className="!text-amber-300">10</strong>.
          </p>
          <p>
            The closest non-Nadal benchmark is {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')}, who owns <strong className="!text-amber-300">7</strong> titles in <Link href={getTourneyHref({ slug: 'paris-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> and <strong className="!text-amber-300">6</strong> each in <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link> and <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, while {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')} set the classic hard-court single-event standard with <strong className="!text-amber-300">7</strong> <Link href={getTourneyHref({ slug: 'cincinnati-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link> titles.
          </p>
          <p>
            In this record, the milestone is not simply collecting many Masters trophies, but turning one elite event into a personal stronghold: {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')} set the ceiling with <strong className="!text-amber-300">11</strong> <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> titles and reinforced it with <strong className="!text-amber-300">10</strong> in <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, with Djokovic and Federer providing the main hard-court and indoor equivalents.
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Titles in the Same Tournament">
        {renderTable(allTitles)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
