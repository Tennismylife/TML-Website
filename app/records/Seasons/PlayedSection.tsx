'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import RecordNarrative from '../RecordNarrative';

interface PlayedSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: PlayedRecord[];
}

type PlayedRecord = {
  id: string;
  player_name: string;
  ioc: string | null;
  total_played: number;
  year: number;
};

export default function PlayedSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: PlayedSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSeasonMatches, setTopSeasonMatches] = useState<PlayedRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModalMatches, setShowModalMatches] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top-10 with the full `limit=100` result set.
    const shouldFetch = showModalMatches || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSeasonMatches(initialData);
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
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
        query.set('limit', showModalMatches ? '1000' : '100');
        const url = `/api/records/seasons/played?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch matches');
        const data: PlayedRecord[] = await res.json();
        setTopSeasonMatches(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error('Error fetching matches played records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModalMatches, initialData, setFetchEnabled]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonMatches.length) return <div className="text-center py-8 text-gray-300 text-lg">No matches found.</div>;

  const totalPages = Math.ceil(topSeasonMatches.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonMatches.slice(start, start + perPage);

  const isMostMatchesPlayedInSingleSeason = description === 'Most Matches Played in Single Season';
  const isMostMasters1000MatchesPlayedInSingleSeason = description === 'Most Masters 1000 Matches Played in a Single Season';
  const isMostHardCourtMatchesPlayedInSingleSeason = description === 'Most Hard Court Matches Played in a Single Season';
  const isMostClayCourtMatchesPlayedInSingleSeason = description === 'Most Clay Court Matches Played in a Single Season';
  const isMostGrandSlamMatchesPlayedInSingleSeason = description === 'Most Grand Slam Matches Played in a Single Season';
  const isMostGrassCourtMatchesPlayedInSingleSeason = description === 'Most Grass Court Matches Played in a Single Season';
  const isMostCarpetCourtMatchesPlayedInSingleSeason = description === 'Most Carpet Court Matches Played in a Single Season';
  const topMatchesSeason = isMostMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondMatchesSeason = isMostMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdMatchesSeason = isMostMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const topMasters1000MatchesSeason = isMostMasters1000MatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondMasters1000MatchesSeason = isMostMasters1000MatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdMasters1000MatchesSeason = isMostMasters1000MatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const topHardCourtMatchesSeason = isMostHardCourtMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondHardCourtMatchesSeason = isMostHardCourtMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdHardCourtMatchesSeason = isMostHardCourtMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const fourthHardCourtMatchesSeason = isMostHardCourtMatchesPlayedInSingleSeason ? topSeasonMatches[3] : undefined;
  const fifthHardCourtMatchesSeason = isMostHardCourtMatchesPlayedInSingleSeason ? topSeasonMatches[4] : undefined;
  const topGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const fourthGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[3] : undefined;
  const fifthGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[4] : undefined;
  const sixthGrandSlamMatchesSeason = isMostGrandSlamMatchesPlayedInSingleSeason ? topSeasonMatches[5] : undefined;
  const topClayCourtMatchesSeason = isMostClayCourtMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondClayCourtMatchesSeason = isMostClayCourtMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdClayCourtMatchesSeason = isMostClayCourtMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const fourthClayCourtMatchesSeason = isMostClayCourtMatchesPlayedInSingleSeason ? topSeasonMatches[3] : undefined;
  const fifthClayCourtMatchesSeason = isMostClayCourtMatchesPlayedInSingleSeason ? topSeasonMatches[4] : undefined;
  const topGrassCourtMatchesSeason = isMostGrassCourtMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondGrassCourtMatchesSeason = isMostGrassCourtMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdGrassCourtMatchesSeason = isMostGrassCourtMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const fourthGrassCourtMatchesSeason = isMostGrassCourtMatchesPlayedInSingleSeason ? topSeasonMatches[3] : undefined;
  const fifthGrassCourtMatchesSeason = isMostGrassCourtMatchesPlayedInSingleSeason ? topSeasonMatches[4] : undefined;
  const topCarpetCourtMatchesSeason = isMostCarpetCourtMatchesPlayedInSingleSeason ? topSeasonMatches[0] : undefined;
  const secondCarpetCourtMatchesSeason = isMostCarpetCourtMatchesPlayedInSingleSeason ? topSeasonMatches[1] : undefined;
  const thirdCarpetCourtMatchesSeason = isMostCarpetCourtMatchesPlayedInSingleSeason ? topSeasonMatches[2] : undefined;
  const fourthCarpetCourtMatchesSeason = isMostCarpetCourtMatchesPlayedInSingleSeason ? topSeasonMatches[3] : undefined;
  const fifthCarpetCourtMatchesSeason = isMostCarpetCourtMatchesPlayedInSingleSeason ? topSeasonMatches[4] : undefined;
  const topFiveSeasonMatches = isMostMatchesPlayedInSingleSeason ? topSeasonMatches.slice(0, 5) : [];

  const hasSixGrandSlamTiedLeaders = !!(
    topGrandSlamMatchesSeason &&
    secondGrandSlamMatchesSeason &&
    thirdGrandSlamMatchesSeason &&
    fourthGrandSlamMatchesSeason &&
    fifthGrandSlamMatchesSeason &&
    sixthGrandSlamMatchesSeason &&
    secondGrandSlamMatchesSeason.total_played === topGrandSlamMatchesSeason.total_played &&
    thirdGrandSlamMatchesSeason.total_played === topGrandSlamMatchesSeason.total_played &&
    fourthGrandSlamMatchesSeason.total_played === topGrandSlamMatchesSeason.total_played &&
    fifthGrandSlamMatchesSeason.total_played === topGrandSlamMatchesSeason.total_played &&
    sixthGrandSlamMatchesSeason.total_played === topGrandSlamMatchesSeason.total_played
  );

  const renderTable = (data: PlayedRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Played</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-400">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_played}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                  <Link href={`/players/${encodeURIComponent((p as any).slug ?? String(p.id))}/season/${p.year}`} className="hover:underline">{p.year}</Link>
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
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-200">
          {description}
        </h2>
      )}
      {isMostMatchesPlayedInSingleSeason && topMatchesSeason && (
        <RecordNarrative className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-200">
            In the Open Era and in tour-level singles only, the benchmark for <strong className="text-gray-50">Most Matches Played in a Single Season</strong> belongs to{' '}
            <span className="inline-flex items-center gap-2">
              {topMatchesSeason.ioc && <Flag ioc={topMatchesSeason.ioc} className="w-4 h-3" />}
              <Link href={playerSurfaceOrMatchesUrl((topMatchesSeason as any).slug ?? String(topMatchesSeason.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-cyan-300 hover:underline">
                {topMatchesSeason.player_name}
              </Link>
            </span>{' '}
            with <strong className="text-amber-300">{topMatchesSeason.total_played}</strong> matches in {topMatchesSeason.year}, a single-season workload that defines the category.
          </p>
          <p className="text-sm leading-relaxed text-gray-300">
            Second place is{' '}
            <span className="inline-flex items-center gap-2">
              {secondMatchesSeason?.ioc && <Flag ioc={secondMatchesSeason.ioc} className="w-4 h-3" />}
              <span>{secondMatchesSeason?.player_name ?? 'n/a'}</span>
            </span>{' '}
            on <strong className="text-amber-300">{secondMatchesSeason?.total_played ?? '—'}</strong> in {secondMatchesSeason?.year ?? '—'}, leaving a gap of{' '}
            <strong className="text-gray-100">{secondMatchesSeason ? topMatchesSeason.total_played - secondMatchesSeason.total_played : 0}</strong>. The broader top five on this durability leaderboard are {topFiveSeasonMatches.map((row, idx) => (
              <span key={`${row.id}-${row.year}-${idx}`}>
                {idx > 0 && idx < topFiveSeasonMatches.length - 1 ? ', ' : idx === topFiveSeasonMatches.length - 1 && topFiveSeasonMatches.length > 2 ? ', and ' : idx > 0 ? ' and ' : ''}
                {row.player_name} with <strong className="text-amber-300">{row.total_played}</strong> in {row.year}
              </span>
            ))}.
          </p>
          <p className="text-sm leading-relaxed text-gray-300">
            The full ranking below keeps every entry visible, while this summary puts the headline record, the chasing pack, and the season-by-season context front and center.
          </p>
        </RecordNarrative>
      )}
      {isMostMasters1000MatchesPlayedInSingleSeason && topMasters1000MatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            {secondMasters1000MatchesSeason && secondMasters1000MatchesSeason.total_played === topMasters1000MatchesSeason.total_played ? (
              <>
                Most Masters 1000 Matches Played in a Single Season reaches an Open Era ceiling of <strong className="!text-amber-300">{topMasters1000MatchesSeason.total_played}</strong>, and the mark is shared by <span className="inline-flex items-center gap-2">{topMasters1000MatchesSeason.ioc && <Flag ioc={topMasters1000MatchesSeason.ioc} className="w-4 h-3" />}{topMasters1000MatchesSeason.player_name}</span> in {topMasters1000MatchesSeason.year} and <span className="inline-flex items-center gap-2">{secondMasters1000MatchesSeason.ioc && <Flag ioc={secondMasters1000MatchesSeason.ioc} className="w-4 h-3" />}{secondMasters1000MatchesSeason.player_name}</span> in {secondMasters1000MatchesSeason.year}. This record is about more than just titles: it rewards availability across the tour’s biggest regular-season events and the ability to string together repeated wins at the elite Masters level. The leader’s season required deep runs through the mandatory hard-court and clay Masters tournaments, plus repeated appearances at the year’s most important non-Slam stops.
              </>
            ) : (
              <>
                Most Masters 1000 Matches Played in a Single Season is led in the Open Era by <span className="inline-flex items-center gap-2">{topMasters1000MatchesSeason.ioc && <Flag ioc={topMasters1000MatchesSeason.ioc} className="w-4 h-3" />}{topMasters1000MatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topMasters1000MatchesSeason.total_played}</strong> Masters 1000 matches in {topMasters1000MatchesSeason.year}. This record is about more than just titles: it rewards availability across the tour’s biggest regular-season events and the ability to string together repeated wins at the elite Masters level. The leader’s season required deep runs through the mandatory hard-court and clay Masters tournaments, plus repeated appearances at the year’s most important non-Slam stops.
              </>
            )}
          </p>
          {thirdMasters1000MatchesSeason && (
            <p>
              Third is <span className="inline-flex items-center gap-2">{thirdMasters1000MatchesSeason.ioc && <Flag ioc={thirdMasters1000MatchesSeason.ioc} className="w-4 h-3" />}{thirdMasters1000MatchesSeason.player_name}</span> with <strong className="!text-amber-300">{thirdMasters1000MatchesSeason.total_played}</strong>, showing how this record favors players who can remain healthy and match-ready across multiple elite tournaments in a single year.
            </p>
          )}
          <p>
            In this record, the milestone is pure Masters 1000 endurance: it is not simply the number of events entered, but the repeated ability to win enough matches at the highest regular-season level to make the season total count. That makes the leader’s season a powerful example of elite-level workload and durability.
          </p>
        </div>
      )}
      {isMostHardCourtMatchesPlayedInSingleSeason && topHardCourtMatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Hard-Court Matches Played in a Single Season stands <span className="inline-flex items-center gap-2">{topHardCourtMatchesSeason.ioc && <Flag ioc={topHardCourtMatchesSeason.ioc} className="w-4 h-3" />}{topHardCourtMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topHardCourtMatchesSeason.total_played}</strong> hard-court matches in {topHardCourtMatchesSeason.year} — the highest recorded single-season hard-court workload in the dataset. {topHardCourtMatchesSeason.player_name}'s {topHardCourtMatchesSeason.year} season was an early-career durability milestone: he was already a Grand Slam champion and an established top player, but this record highlights a different side of his development, not just peak dominance but the ability to sustain a heavy hard-court schedule across the full season. Playing <strong className="!text-amber-300">{topHardCourtMatchesSeason.total_played}</strong> hard-court matches in one year required consistency across multiple calendar blocks — the opening hard-court swing, the North American summer, the Asian indoor/outdoor stretch, and the late-season events.
          </p>
          {(secondHardCourtMatchesSeason || thirdHardCourtMatchesSeason) && (
            <p>
              {secondHardCourtMatchesSeason && (
                <>
                  Behind him comes <span className="inline-flex items-center gap-2">{secondHardCourtMatchesSeason.ioc && <Flag ioc={secondHardCourtMatchesSeason.ioc} className="w-4 h-3" />}{secondHardCourtMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{secondHardCourtMatchesSeason.total_played}</strong> hard-court matches in {secondHardCourtMatchesSeason.year}.
                </>
              )}
              {secondHardCourtMatchesSeason && thirdHardCourtMatchesSeason && ' '}
              {thirdHardCourtMatchesSeason && (
                <>
                  Third is still <span>{thirdHardCourtMatchesSeason.player_name}</span>, who also played <strong className="!text-amber-300">{thirdHardCourtMatchesSeason.total_played}</strong> hard-court matches in {thirdHardCourtMatchesSeason.year}
                  {secondHardCourtMatchesSeason && secondHardCourtMatchesSeason.player_name === thirdHardCourtMatchesSeason.player_name && secondHardCourtMatchesSeason.total_played === thirdHardCourtMatchesSeason.total_played
                    ? <> — the same workload mark reached in {secondHardCourtMatchesSeason.year}.</>
                    : <>.</>}
                </>
              )}
            </p>
          )}
          {fourthHardCourtMatchesSeason && (
            <p>
              The next tier is led by <span className="inline-flex items-center gap-2">{fourthHardCourtMatchesSeason.ioc && <Flag ioc={fourthHardCourtMatchesSeason.ioc} className="w-4 h-3" />}{fourthHardCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{fourthHardCourtMatchesSeason.total_played}</strong> hard-court matches in {fourthHardCourtMatchesSeason.year}.
              {fifthHardCourtMatchesSeason && fourthHardCourtMatchesSeason.total_played === fifthHardCourtMatchesSeason.total_played && (
                <> This mark is shared at <strong className="!text-amber-300">{fourthHardCourtMatchesSeason.total_played}</strong>, also reached by <span className="inline-flex items-center gap-2">{fifthHardCourtMatchesSeason.ioc && <Flag ioc={fifthHardCourtMatchesSeason.ioc} className="w-4 h-3" />}{fifthHardCourtMatchesSeason.player_name}</span> in {fifthHardCourtMatchesSeason.year}.</>
              )}
            </p>
          )}
          {fifthHardCourtMatchesSeason && !(fourthHardCourtMatchesSeason && fourthHardCourtMatchesSeason.total_played === fifthHardCourtMatchesSeason.total_played) && (
            <p>
              Also notable is <span className="inline-flex items-center gap-2">{fifthHardCourtMatchesSeason.ioc && <Flag ioc={fifthHardCourtMatchesSeason.ioc} className="w-4 h-3" />}{fifthHardCourtMatchesSeason.player_name}</span>, whose {fifthHardCourtMatchesSeason.year} season reinforces the idea that this record belongs to the high-volume tour-grinder side of hard-court endurance.
            </p>
          )}
          <p>
            In this record, the milestone is not title-winning efficiency or win percentage, but surface-specific match volume: {topHardCourtMatchesSeason.player_name} set the ceiling with <strong className="!text-amber-300">{topHardCourtMatchesSeason.total_played}</strong> hard-court matches in {topHardCourtMatchesSeason.year}, while the rest of the top list shows the high-volume tour-grinder side of hard-court endurance.
          </p>
        </div>
      )}
      {isMostGrandSlamMatchesPlayedInSingleSeason && topGrandSlamMatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          {hasSixGrandSlamTiedLeaders ? (
            <p>
              The Open Era ceiling for Most Grand Slam Matches Played in a Single Season is <strong className="!text-amber-300">{topGrandSlamMatchesSeason.total_played}</strong>, and it is shared: <span className="inline-flex items-center gap-2">{topGrandSlamMatchesSeason.ioc && <Flag ioc={topGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{topGrandSlamMatchesSeason.player_name}</span> ({topGrandSlamMatchesSeason.year}), <span className="inline-flex items-center gap-2">{secondGrandSlamMatchesSeason.ioc && <Flag ioc={secondGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{secondGrandSlamMatchesSeason.player_name}</span> ({secondGrandSlamMatchesSeason.year}), <span className="inline-flex items-center gap-2">{thirdGrandSlamMatchesSeason.ioc && <Flag ioc={thirdGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{thirdGrandSlamMatchesSeason.player_name}</span> ({thirdGrandSlamMatchesSeason.year}), <span className="inline-flex items-center gap-2">{fourthGrandSlamMatchesSeason.ioc && <Flag ioc={fourthGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{fourthGrandSlamMatchesSeason.player_name}</span> ({fourthGrandSlamMatchesSeason.year}), <span className="inline-flex items-center gap-2">{fifthGrandSlamMatchesSeason.ioc && <Flag ioc={fifthGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{fifthGrandSlamMatchesSeason.player_name}</span> ({fifthGrandSlamMatchesSeason.year}), and <span className="inline-flex items-center gap-2">{sixthGrandSlamMatchesSeason.ioc && <Flag ioc={sixthGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{sixthGrandSlamMatchesSeason.player_name}</span> ({sixthGrandSlamMatchesSeason.year}).
            </p>
          ) : (
            <>
              <p>
                At the top of the Open Era list for Most Grand Slam Matches Played in a Single Season stands <span className="inline-flex items-center gap-2">{topGrandSlamMatchesSeason.ioc && <Flag ioc={topGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{topGrandSlamMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topGrandSlamMatchesSeason.total_played}</strong> major matches in {topGrandSlamMatchesSeason.year}. This is the highest reported single-season workload in the Grand Slam dataset.
              </p>
              {secondGrandSlamMatchesSeason && (
                <p>
                  Behind him comes <span className="inline-flex items-center gap-2">{secondGrandSlamMatchesSeason.ioc && <Flag ioc={secondGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{secondGrandSlamMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{secondGrandSlamMatchesSeason.total_played}</strong> Slam matches in {secondGrandSlamMatchesSeason.year}.
                </p>
              )}
              {thirdGrandSlamMatchesSeason && (
                <p>
                  Third is <span className="inline-flex items-center gap-2">{thirdGrandSlamMatchesSeason.ioc && <Flag ioc={thirdGrandSlamMatchesSeason.ioc} className="w-4 h-3" />}{thirdGrandSlamMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{thirdGrandSlamMatchesSeason.total_played}</strong> Slam matches in {thirdGrandSlamMatchesSeason.year}.
                </p>
              )}
            </>
          )}
          <p>
            Context for the number: each Slam main draw requires 7 wins to take the title, so the theoretical maximum is <strong className="!text-amber-300">28</strong> matches across the four majors (7+7+7+7). In practical terms, this is a full-season major endurance marker: one early exit immediately pulls the total down, and sustaining this level requires deep runs from Melbourne through New York.
          </p>
        </div>
      )}
      {isMostClayCourtMatchesPlayedInSingleSeason && topClayCourtMatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Clay-Court Matches Played in a Single Season stands <span className="inline-flex items-center gap-2">{topClayCourtMatchesSeason.ioc && <Flag ioc={topClayCourtMatchesSeason.ioc} className="w-4 h-3" />}{topClayCourtMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topClayCourtMatchesSeason.total_played}</strong> clay-court matches in {topClayCourtMatchesSeason.year} — the highest recorded single-season clay workload in the Open Era. That season was a different kind of endurance achievement: it required clay-court durability across spring and summer, where long matches, extended rallies and grueling best-of-three or best-of-five battles multiply the physical demand.
          </p>
          {(secondClayCourtMatchesSeason || thirdClayCourtMatchesSeason || fourthClayCourtMatchesSeason || fifthClayCourtMatchesSeason) && (
            <p>
              {secondClayCourtMatchesSeason && (
                <>
                  Behind him comes <span className="inline-flex items-center gap-2">{secondClayCourtMatchesSeason.ioc && <Flag ioc={secondClayCourtMatchesSeason.ioc} className="w-4 h-3" />}{secondClayCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{secondClayCourtMatchesSeason.total_played}</strong> clay-court matches in {secondClayCourtMatchesSeason.year}.
                </>
              )}
              {secondClayCourtMatchesSeason && thirdClayCourtMatchesSeason && ' '}
              {thirdClayCourtMatchesSeason && (
                <>
                  Third is <span className="inline-flex items-center gap-2">{thirdClayCourtMatchesSeason.ioc && <Flag ioc={thirdClayCourtMatchesSeason.ioc} className="w-4 h-3" />}{thirdClayCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{thirdClayCourtMatchesSeason.total_played}</strong> clay matches.
                </>
              )}
              {(secondClayCourtMatchesSeason || thirdClayCourtMatchesSeason) && fourthClayCourtMatchesSeason && ' '}
              {fourthClayCourtMatchesSeason && (
                <>
                  The next tier is led by <span className="inline-flex items-center gap-2">{fourthClayCourtMatchesSeason.ioc && <Flag ioc={fourthClayCourtMatchesSeason.ioc} className="w-4 h-3" />}{fourthClayCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{fourthClayCourtMatchesSeason.total_played}</strong> clay-court matches in {fourthClayCourtMatchesSeason.year}.
                </>
              )}
              {(secondClayCourtMatchesSeason || thirdClayCourtMatchesSeason || fourthClayCourtMatchesSeason) && fifthClayCourtMatchesSeason && ' '}
              {fifthClayCourtMatchesSeason && (
                <>
                  Also present is <span className="inline-flex items-center gap-2">{fifthClayCourtMatchesSeason.ioc && <Flag ioc={fifthClayCourtMatchesSeason.ioc} className="w-4 h-3" />}{fifthClayCourtMatchesSeason.player_name}</span>, highlighting how this record rewards repeated clay-court participation across the season.
                </>
              )}
            </p>
          )}
          <p>
            In this record, the milestone is surface-specific match volume on the most physically demanding surface: the leader combined clay-court resilience, repeated tournament participation and enough match wins to set the single-season clay workload ceiling.
          </p>
        </div>
      )}
      {isMostGrassCourtMatchesPlayedInSingleSeason && topGrassCourtMatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Grass-Court Matches Played in a Single Season stands <span className="inline-flex items-center gap-2">{topGrassCourtMatchesSeason.ioc && <Flag ioc={topGrassCourtMatchesSeason.ioc} className="w-4 h-3" />}{topGrassCourtMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topGrassCourtMatchesSeason.total_played}</strong> grass-court matches in {topGrassCourtMatchesSeason.year} — the highest recorded single-season grass workload in the Open Era. A heavy grass-court season is rare because the surface calendar is usually short and the conditions favor quick finishes, so this record rewards players who not only entered many grass events but also pushed deep into the draw across the entire grass swing. With so few grass tournaments on the modern calendar, this mark is effectively out of reach.
          </p>
          {(secondGrassCourtMatchesSeason || thirdGrassCourtMatchesSeason || fourthGrassCourtMatchesSeason || fifthGrassCourtMatchesSeason) && (
            <p>
              {secondGrassCourtMatchesSeason && (
                <>
                  Behind the leader comes <span className="inline-flex items-center gap-2">{secondGrassCourtMatchesSeason.ioc && <Flag ioc={secondGrassCourtMatchesSeason.ioc} className="w-4 h-3" />}{secondGrassCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{secondGrassCourtMatchesSeason.total_played}</strong> grass-court matches in {secondGrassCourtMatchesSeason.year}.
                </>
              )}
              {secondGrassCourtMatchesSeason && thirdGrassCourtMatchesSeason && ' '}
              {thirdGrassCourtMatchesSeason && (
                <>
                  Third is <span className="inline-flex items-center gap-2">{thirdGrassCourtMatchesSeason.ioc && <Flag ioc={thirdGrassCourtMatchesSeason.ioc} className="w-4 h-3" />}{thirdGrassCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{thirdGrassCourtMatchesSeason.total_played}</strong> grass matches.
                </>
              )}
              {(secondGrassCourtMatchesSeason || thirdGrassCourtMatchesSeason) && fourthGrassCourtMatchesSeason && ' '}
              {fourthGrassCourtMatchesSeason && (
                <>
                  The next tier is led by <span className="inline-flex items-center gap-2">{fourthGrassCourtMatchesSeason.ioc && <Flag ioc={fourthGrassCourtMatchesSeason.ioc} className="w-4 h-3" />}{fourthGrassCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{fourthGrassCourtMatchesSeason.total_played}</strong> grass-court matches in {fourthGrassCourtMatchesSeason.year}.
                </>
              )}
              {(secondGrassCourtMatchesSeason || thirdGrassCourtMatchesSeason || fourthGrassCourtMatchesSeason) && fifthGrassCourtMatchesSeason && ' '}
              {fifthGrassCourtMatchesSeason && (
                <>
                  Also notable is <span className="inline-flex items-center gap-2">{fifthGrassCourtMatchesSeason.ioc && <Flag ioc={fifthGrassCourtMatchesSeason.ioc} className="w-4 h-3" />}{fifthGrassCourtMatchesSeason.player_name}</span>, showing that this record rewards repeated grass-season endurance and participation.
                </>
              )}
            </p>
          )}
          <p>
            In this record, the milestone is pure grass-court volume: the leader combined the rare ability to play many grass events with the consistency to win enough matches to set the single-season grass workload ceiling.
          </p>
        </div>
      )}
      {isMostCarpetCourtMatchesPlayedInSingleSeason && topCarpetCourtMatchesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Carpet Court Matches Played in a Single Season stands <span className="inline-flex items-center gap-2">{topCarpetCourtMatchesSeason.ioc && <Flag ioc={topCarpetCourtMatchesSeason.ioc} className="w-4 h-3" />}{topCarpetCourtMatchesSeason.player_name}</span>, who played <strong className="!text-amber-300">{topCarpetCourtMatchesSeason.total_played}</strong> carpet-court matches in {topCarpetCourtMatchesSeason.year} — the highest recorded single-season carpet workload in the Open Era. Carpet seasons were historically compact and fast, so this record rewards players who combined repeated season-long participation with deep runs in the level’s limited schedule. The surface’s low bounce and quick pace amplify the demand on players who took part in many carpet events, making this a record about durability and match volume rather than just title count.
          </p>
          {(secondCarpetCourtMatchesSeason || thirdCarpetCourtMatchesSeason || fourthCarpetCourtMatchesSeason || fifthCarpetCourtMatchesSeason) && (
            <p>
              {secondCarpetCourtMatchesSeason && (
                <>
                  Behind the leader comes <span className="inline-flex items-center gap-2">{secondCarpetCourtMatchesSeason.ioc && <Flag ioc={secondCarpetCourtMatchesSeason.ioc} className="w-4 h-3" />}{secondCarpetCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{secondCarpetCourtMatchesSeason.total_played}</strong> carpet-court matches in {secondCarpetCourtMatchesSeason.year}.
                </>
              )}
              {secondCarpetCourtMatchesSeason && thirdCarpetCourtMatchesSeason && ' '}
              {thirdCarpetCourtMatchesSeason && (
                <>
                  Third is <span className="inline-flex items-center gap-2">{thirdCarpetCourtMatchesSeason.ioc && <Flag ioc={thirdCarpetCourtMatchesSeason.ioc} className="w-4 h-3" />}{thirdCarpetCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{thirdCarpetCourtMatchesSeason.total_played}</strong> ones in {thirdCarpetCourtMatchesSeason.year}, underscoring how this record rewards repeated carpet-court appearances across the year.
                </>
              )}
              {(secondCarpetCourtMatchesSeason || thirdCarpetCourtMatchesSeason) && fourthCarpetCourtMatchesSeason && ' '}
              {fourthCarpetCourtMatchesSeason && (
                <>
                  The next tier includes <span className="inline-flex items-center gap-2">{fourthCarpetCourtMatchesSeason.ioc && <Flag ioc={fourthCarpetCourtMatchesSeason.ioc} className="w-4 h-3" />}{fourthCarpetCourtMatchesSeason.player_name}</span> with <strong className="!text-amber-300">{fourthCarpetCourtMatchesSeason.total_played}</strong> carpet matches in {fourthCarpetCourtMatchesSeason.year}.
                </>
              )}
              {(secondCarpetCourtMatchesSeason || thirdCarpetCourtMatchesSeason || fourthCarpetCourtMatchesSeason) && fifthCarpetCourtMatchesSeason && ' '}
              {fifthCarpetCourtMatchesSeason && (
                <>
                  Also notable is <span className="inline-flex items-center gap-2">{fifthCarpetCourtMatchesSeason.ioc && <Flag ioc={fifthCarpetCourtMatchesSeason.ioc} className="w-4 h-3" />}{fifthCarpetCourtMatchesSeason.player_name}</span>, reinforcing that this record is driven by repeated carpet participation and endurance.
                </>
              )}
            </p>
          )}
          <p>
            In this record, the milestone is pure carpet-court match volume: the leader combined fast-surface consistency with enough event participation to set the single-season carpet workload ceiling.
          </p>
        </div>
      )}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModalMatches(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalMatches}
        onClose={() => setShowModalMatches(false)}
        title="Top Matches Played in a Single Season"
      >
        {renderTable(topSeasonMatches)}
      </Modal>
    </section>
  );
}
