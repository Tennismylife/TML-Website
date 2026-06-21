'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTourneyHref, getPlayerHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import Flag from '@/components/Flag';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface EntriesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  description?: string;
}

interface EntryRecord {
  player_id: string;
  player_name: string;
  ioc: string;
  total_entries: number;
  tourney_id: string;
  tourney_name: string;
}

export default function EntriesSection({ selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: EntriesSectionProps & { fetchRequestId?: string | null; initialData?: EntryRecord[] }) {
  const enabled = !!fetchEnabled;
  const [allEntries, setAllEntries] = useState<EntryRecord[]>(Array.isArray(initialData) ? initialData : []);
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
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0) || !initialData?.length;
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setAllEntries(initialData);
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
        const url = `/api/records/same/entries?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch entries');
        const data: EntryRecord[] = await res.json();
        setAllEntries(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setAllEntries([]);
        setError('Failed to load records.');
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  const hasRows = allEntries.length > 0;

  const totalPages = Math.ceil(allEntries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allEntries.slice(start, start + perPage);
  const isMostAppearancesAtSingleTournament = description === 'Most Appearances at Single Tournament';
  const isMostAppearancesAtSingleGrandSlamTournament = description === 'Most Appearances at Single Grand Slam Tournament';
  const isMostAppearancesAtSingleMasters1000Tournament = description === 'Most Appearances at Single Masters 1000 Tournament';

  const renderPlayerLink = (name: string, slug: string, ioc: string) => (
    <span className="inline-flex items-center gap-2">
      <Flag ioc={ioc} className="w-4 h-3" />
      <Link href={getPlayerHref(slug)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">
        {name}
      </Link>
    </span>
  );

 

  const renderTable = (data: EntryRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Entries</th>
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
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_entries}</td>
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

      {isMostAppearancesAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The current Open Era leaderboard for Most Appearances at a Single Tournament is headed by a five-way tie at <strong className="!text-amber-300">22</strong>: {renderPlayerLink('Roger Federer', 'roger-federer', 'SUI')} at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')} at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, {renderPlayerLink('Richard Gasquet', 'richard-gasquet', 'FRA')} at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, {renderPlayerLink('Jimmy Connors', 'jimmy-connors', 'USA')} at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, and {renderPlayerLink('Feliciano Lopez', 'feliciano-lopez', 'ESP')} at <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>.
          </p>
          <p>
            This tie shows five different longevity profiles in one record: Federer’s sustained Wimbledon presence, Djokovic and Gasquet’s Roland Garros continuity, Connors’ multi-era US Open durability, and Lopez’s extended run at Barcelona.
          </p>
          <p>
            Just behind the leaders, a large group sits at <strong className="!text-amber-300">21</strong> appearances, including {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')} at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, {renderPlayerLink('Andre Agassi', 'andre-agassi', 'USA')} at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, {renderPlayerLink('Jimmy Connors', 'jimmy-connors', 'USA')} at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, {renderPlayerLink('Roger Federer', 'roger-federer', 'SUI')} at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, and {renderPlayerLink('Feliciano Lopez', 'feliciano-lopez', 'ESP')} at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>.
          </p>
          <p>
            In this category, the key milestone is repeated main-draw presence at the same event across many seasons: the ceiling is now <strong className="!text-amber-300">22</strong> appearances, with a deep chasing pack already at <strong className="!text-amber-300">21</strong>.
          </p>
        </div>
      )}

      {isMostAppearancesAtSingleGrandSlamTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The current Open Era leaderboard for Most Appearances at a Single Grand Slam Tournament is headed by a three-way tie at <strong className="!text-amber-300">22</strong>: {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')} at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, {renderPlayerLink('Richard Gasquet', 'richard-gasquet', 'FRA')} at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, and {renderPlayerLink('Jimmy Connors', 'jimmy-connors', 'USA')} at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>.
          </p>
          <p>
            Each of those <strong className="!text-amber-300">22</strong>-appearance records represents a different Grand Slam longevity profile: Federer's sustained dominance and yearly return at Wimbledon, Gasquet's exceptional long-span presence at Roland Garros, and Connors' multi-era durability at the US Open.
          </p>
          <p>
            Just behind the leaders, several players already sit at <strong className="!text-amber-300">21</strong> appearances, including {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')} at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')} at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, {renderPlayerLink('Andre Agassi', 'andre-agassi', 'USA')} at the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, and {renderPlayerLink('Jimmy Connors', 'jimmy-connors', 'USA')} at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>.
          </p>
          <p>
            In this category, the milestone is repeated main-draw presence at the same major over many seasons: the ceiling is now <strong className="!text-amber-300">22</strong> appearances, with a strong group already at <strong className="!text-amber-300">21</strong> and still defining the modern chase behind it.
          </p>
        </div>
      )}

      {isMostAppearancesAtSingleMasters1000Tournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
              The current leaderboard for Most Appearances at a Single Masters 1000 Tournament is led by {renderPlayerLink('Rafael Nadal', 'rafael-nadal', 'ESP')} at the <Link href={getTourneyHref({ slug: 'madrid-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid Masters</Link>, where he reached <strong className="!text-amber-300">20</strong> appearances. Nadal first played Madrid in 2003 and last played it in 2024.
          </p>
          <p>
              Just behind that mark is Nadal again at the <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> with <strong className="!text-amber-300">19</strong> appearances, tied with {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')} on the same number. In Rome, Nadal’s first appearance came in 2005 and his last in 2024, while Djokovic’s run there also places him on <strong className="!text-amber-300">19</strong>.
          </p>
          <p>
            The next tier is crowded at <strong className="!text-amber-300">18</strong> appearances: {renderPlayerLink('Roger Federer', 'roger-federer', 'CHE')} at <Link href={getTourneyHref({ slug: 'indian-wells-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells Masters</Link> and <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami Masters</Link>, {renderPlayerLink('Feliciano Lopez', 'feliciano-lopez', 'ESP')} at Indian Wells and Miami, {renderPlayerLink('Fernando Verdasco', 'fernando-verdasco', 'ESP')} at Miami, {renderPlayerLink('Novak Djokovic', 'novak-djokovic', 'SRB')} at the <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo Masters</Link> and Rome, and {renderPlayerLink('Stan Wawrinka', 'stan-wawrinka', 'CHE')} at Rome.
          </p>
          <p>
            In this record, the milestone is repeated main-draw presence at the same Masters 1000 stop over many seasons: Nadal currently sets the ceiling at <strong className="!text-amber-300">20</strong> in Madrid, while Rome is now tied on <strong className="!text-amber-300">19</strong> between Nadal and Djokovic, and a broad chasing group is already clustered on <strong className="!text-amber-300">18</strong> across several flagship events.
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Entries in the Same Tournament">
        {renderTable(allEntries)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
