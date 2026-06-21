'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref, getTourneyHref } from '@/lib/utils';
import { playerSurfaceOrMatchesUrl } from '../nav';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface WinsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  description?: string;
  initialData?: WinRecord[];
}

type WinRecord = {
  winner_id: string;
  player_name: string;
  ioc: string | null;
  total_wins: number;
  year: number;
};

function buildPlayerQueryParams(sp?: Record<string, string | string[] | undefined>) {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(sp || {})) {
    if (!value || key === 'tab') continue;
    params[key] = value;
  }
  return params;
}

export default function WinsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, searchParams, description, initialData }: WinsSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSameTournamentWins, setTopSameTournamentWins] = useState<WinRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const lastRequestRef = useRef<string | null>(null);
  const playerLinkParams = buildPlayerQueryParams(searchParams);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSameTournamentWins(initialData);
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

        const url = `/api/records/seasons/wins?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch wins')

        const data: WinRecord[] = await res.json();
        setTopSameTournamentWins(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error('[Seasons Wins] error fetching', err);
        if (!Array.isArray(initialData) || initialData.length === 0) {
          setTopSameTournamentWins([]);
          setError('Failed to load records.');
        }
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  const hasRows = topSameTournamentWins.length > 0;

  const totalPages = Math.ceil(topSameTournamentWins.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSameTournamentWins.slice(start, start + perPage);



  const isMostWinsInSingleSeason = description === 'Most Wins in Single Season';
  const isMostGrandSlamWinsInSingleSeason = description === 'Most Grand Slam Match Wins in a Single Season';
  const isMostMasters1000WinsInSingleSeason = description === 'Most Masters 1000 Match Wins in a Single Season';
  const isMostHardCourtWinsInSingleSeason = description === 'Most Hard Court Match Wins in a Single Season';
  const isMostClayCourtWinsInSingleSeason = description === 'Most Clay Court Match Wins in a Single Season';
  const isMostGrassCourtWinsInSingleSeason = description === 'Most Grass Court Match Wins in a Single Season';
  const isMostCarpetCourtWinsInSingleSeason = description === 'Most Carpet Court Match Wins in a Single Season';
  const topGrandSlamSeason = isMostGrandSlamWinsInSingleSeason ? topSameTournamentWins[0] : undefined;
  const secondGrandSlamSeason = isMostGrandSlamWinsInSingleSeason ? topSameTournamentWins[1] : undefined;
  const isSharedGrandSlamLeader = Boolean(
    topGrandSlamSeason
    && secondGrandSlamSeason
    && ((topGrandSlamSeason as any).winner_id === (secondGrandSlamSeason as any).winner_id
      || topGrandSlamSeason.player_name === secondGrandSlamSeason.player_name)
  );
  const thirdGrandSlamSeason = isMostGrandSlamWinsInSingleSeason ? topSameTournamentWins[2] : undefined;
  const fourthGrandSlamSeason = isMostGrandSlamWinsInSingleSeason ? topSameTournamentWins[3] : undefined;
  const fifthGrandSlamSeason = isMostGrandSlamWinsInSingleSeason ? topSameTournamentWins[4] : undefined;
  const topMastersSeason = isMostMasters1000WinsInSingleSeason ? topSameTournamentWins[0] : undefined;
  const secondMastersSeason = isMostMasters1000WinsInSingleSeason ? topSameTournamentWins[1] : undefined;
  const thirdMastersSeason = isMostMasters1000WinsInSingleSeason ? topSameTournamentWins[2] : undefined;
  const topClaySeason = isMostClayCourtWinsInSingleSeason ? topSameTournamentWins[0] : undefined;
  const secondClaySeason = isMostClayCourtWinsInSingleSeason ? topSameTournamentWins[1] : undefined;
  const thirdClaySeason = isMostClayCourtWinsInSingleSeason ? topSameTournamentWins[2] : undefined;
  const topGrassSeason = isMostGrassCourtWinsInSingleSeason ? topSameTournamentWins[0] : undefined;
  const secondGrassSeason = isMostGrassCourtWinsInSingleSeason ? topSameTournamentWins[1] : undefined;
  const thirdGrassSeason = isMostGrassCourtWinsInSingleSeason ? topSameTournamentWins[2] : undefined;
  const topCarpetSeason = isMostCarpetCourtWinsInSingleSeason ? topSameTournamentWins[0] : undefined;
  const secondCarpetSeason = isMostCarpetCourtWinsInSingleSeason ? topSameTournamentWins[1] : undefined;
  const thirdCarpetSeason = isMostCarpetCourtWinsInSingleSeason ? topSameTournamentWins[2] : undefined;

  const renderTable = (data: WinRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.winner_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-grayy-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).winner_slug ?? String(p.winner_id), playerLinkParams)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/players/${encodeURIComponent((p as any).winner_slug ?? String(p.winner_id))}/season/${p.year}`} className="hover:underline">{p.year}</Link>
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
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-200">
          {description}
        </h2>
      )}
      {isMostWinsInSingleSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Most Wins in a Single Season stands 🇦🇷 Guillermo Vilas, who recorded <strong className="!text-amber-300">136</strong> wins in 1977 — the highest single-season match-win total in men’s Open Era tennis.
            Vilas’ 1977 season was one of the most physically extreme campaigns ever: he won 16 titles, reached 21 finals, claimed two Grand Slam titles at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, and produced one of the longest winning streaks of the Open Era. ATP describes 1977 as a monumental year, highlighting his French and US titles plus the famous 46-match winning streak.
          </p>
          <p>
            Behind him comes 🇷🇴 Ilie Nastase, who appears twice near the very top with <strong className="!text-amber-300">125</strong> wins in 1973 and <strong className="!text-amber-300">120</strong> wins in 1972. Those seasons belong to the high-volume early Open Era, when elite players often contested far more tournaments and matches than modern top players do.
          </p>
          <p>
            The next major benchmarks are 🇺🇸 Ivan Lendl, with <strong className="!text-amber-300">110</strong> wins in 1980 and <strong className="!text-amber-300">106</strong> wins in 1982, and 🇺🇸 Brian Gottfried, also with <strong className="!text-amber-300">110</strong> wins in 1977. Lendl’s 1982 season is especially notable because he combined huge volume with elite dominance, winning 15 titles and producing one of the finest high-volume seasons of the 1980s.
          </p>
          <p>
            A separate modern reference point is 🇨🇭 Roger Federer, who won <strong className="!text-amber-300">92</strong> matches in 2006 with a 94.7% win rate, while 🇷🇸 Novak Djokovic won <strong className="!text-amber-300">82</strong> matches in 2015 at 93.2%. They do not approach Vilas’ raw match-win volume, but they represent the modern efficiency version of the record: fewer tournaments, fewer total matches, and historically high win percentages.
          </p>
          <p>
            In this record, the milestone is pure season-long volume: Vilas set the Open Era ceiling with <strong className="!text-amber-300">136</strong> wins in 1977, Nastase represents the other extreme early-1970s workload case, while Federer 2006 and Djokovic 2015 are the modern high-efficiency equivalents.
          </p>
        </div>
      )}
      {isMostGrandSlamWinsInSingleSeason && topGrandSlamSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          {isSharedGrandSlamLeader ? (
            <p>
              At the top of the Open Era list for Most Grand Slam Wins in a Single Season stands a shared ceiling of <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong> major match wins — one short of the theoretical maximum of 28. The record has been reached multiple times by <span className="inline-flex items-center gap-2">{topGrandSlamSeason.ioc && <Flag ioc={topGrandSlamSeason.ioc} className="w-4 h-3" />}{topGrandSlamSeason.player_name}</span> in near-perfect Slam seasons, and once by 🇨🇭 Roger Federer in 2006.
            </p>
          ) : (
            <p>
              At the top of the Open Era list for Most Grand Slam Wins in a Single Season stands a shared ceiling of <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong> major match wins — one short of the theoretical maximum of 28. The record has been reached by <span className="inline-flex items-center gap-2">{secondGrandSlamSeason?.ioc && <Flag ioc={secondGrandSlamSeason.ioc} className="w-4 h-3" />}{secondGrandSlamSeason?.player_name ?? 'Roger Federer'}</span> and <span className="inline-flex items-center gap-2">{topGrandSlamSeason.ioc && <Flag ioc={topGrandSlamSeason.ioc} className="w-4 h-3" />}{topGrandSlamSeason.player_name}</span> in multiple near-perfect Slam seasons.
            </p>
          )}
          <p>
            A special historical case remains 🇦🇺 Rod Laver in 1969: he is the only player to win every Grand Slam match he played in a single season, completing the calendar-year Grand Slam with <strong className="!text-amber-300">26</strong> wins and an unbeaten record. That total is lower than modern top totals because the draw structure of that era required fewer matches.
          </p>
          <p>
            🇨🇭 Roger Federer was the first modern player to hit the mark, recording <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong> Grand Slam wins in 2006: he won the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, and reached the <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> final, losing only once at the majors all season. He repeated the same total in 2007, again winning three Slams and reaching the French Open final.
          </p>
          <p>
            🇷🇸 Novak Djokovic later matched the record in three different seasons. In 2015, he won the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, and reached the <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> final. In 2021, he again reached <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong>, winning the first three majors of the year before losing the US Open final. In 2023, he recorded another <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong>-win Slam season by winning the Australian Open, Roland Garros and the US Open, while finishing runner-up at Wimbledon.
          </p>
          <p>
            Behind the <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong>-win ceiling come other elite near-perfect seasons: 🇮🇹 Jannik Sinner reached <strong className="!text-amber-300">26</strong> Grand Slam wins in 2025, while Djokovic also had <strong className="!text-amber-300">26</strong> in 2011 and Federer had <strong className="!text-amber-300">26</strong> in 2009.
          </p>
          <p>
            In this record, the milestone is not simply winning Slams, but maintaining near-total consistency across all four majors in the same year: <strong className="!text-amber-300">{topGrandSlamSeason.total_wins}</strong> wins means reaching all four finals and winning three titles, or producing an equivalent near-perfect Slam campaign. Federer set the modern benchmark first in 2006, while Djokovic became the great repeat case, matching the ceiling in 2015, 2021 and 2023.
          </p>
        </div>
      )}
      {isMostMasters1000WinsInSingleSeason && topMastersSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Most Masters 1000 Wins in a Single Season stands <span className="inline-flex items-center gap-2">{topMastersSeason.ioc && <Flag ioc={topMastersSeason.ioc} className="w-4 h-3" />}{topMastersSeason.player_name}</span>, who recorded <strong className="!text-amber-300">{topMastersSeason.total_wins}</strong> Masters 1000 match wins in {topMastersSeason.year}, the highest single-season total in the Masters 1000 era.
          </p>
          <p>
            Djokovic’s {topMastersSeason.year} Masters campaign was almost perfect: he won 6 Masters 1000 titles — <Link href={getTourneyHref({ slug: 'indian-wells-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href={getTourneyHref({ slug: 'shanghai' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and <Link href={getTourneyHref({ slug: 'paris-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> — and also reached the finals in <Link href={getTourneyHref({ slug: 'canada-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada</Link> and <Link href={getTourneyHref({ slug: 'cincinnati-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link>. The only 2 Masters 1000 losses that season came in finals: against 🇬🇧 Andy Murray at the <Link href={getTourneyHref({ slug: 'canada-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada Masters</Link> and against 🇨🇭 Roger Federer at <Link href={getTourneyHref({ slug: 'cincinnati-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link>. Everywhere else, he converted his Masters appearances into titles, finishing the level with a {Math.round((topMastersSeason.total_wins / (topMastersSeason.total_wins + 2)) * 1000) / 10}% win rate.
          </p>
          <p>
            Behind him, the next major references are 🇪🇸 Rafael Nadal in 2013, with <strong className="!text-amber-300">35</strong> Masters 1000 wins and 5 titles, and Nadal again in 2009, with <strong className="!text-amber-300">34</strong> wins and 3 titles. Djokovic also appears again with his 2012 season, when he produced <strong className="!text-amber-300">34</strong> Masters 1000 wins and 3 titles.
          </p>
          <p>
            A separate efficiency reference is 🇨🇭 Roger Federer in 2006, who won <strong className="!text-amber-300">34</strong> Masters 1000 matches and captured 4 Masters titles while producing one of the greatest overall seasons in ATP history.
          </p>
          <p>
            In this record, the milestone is pure Masters 1000 volume across one season: {topMastersSeason.player_name} set the ceiling with <strong className="!text-amber-300">{topMastersSeason.total_wins}</strong> Masters wins in {topMastersSeason.year}, combining 6 titles, 8 finals and only 2 defeats at the level — the most complete Masters 1000 season ever recorded.
          </p>
        </div>
      )}
      {isMostHardCourtWinsInSingleSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The Open Era record for Most Hard-Court Wins in a Single Season is shared by 🇨🇭 Roger Federer in 2006 and 🇷🇸 Novak Djokovic in 2015, both recorded with <strong className="!text-amber-300">59</strong> hard-court wins. Federer's 2006 campaign was one of the purest displays of attacking hard-court excellence the ATP has ever seen: 59–2 on hard courts and 92–5 overall, a season built through a sequence of deep runs and titles from the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> to the <Link href={getTourneyHref({ slug: 'atp-finals' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters Cup</Link>.
          </p>
          <p>
            Djokovic's 2015 season reached the same <strong className="!text-amber-300">59</strong>-win summit in a very different way: 59–5 on hard courts and 82–6 overall, a year powered by titles at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'indian-wells-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, <Link href={getTourneyHref({ slug: 'shanghai' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link>, <Link href={getTourneyHref({ slug: 'paris-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> and the <Link href={getTourneyHref({ slug: 'atp-finals' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>, turning hard courts into the foundation of one of the greatest modern seasons in men's tennis.
          </p>
          <p>
            Among more recent seasons, 🇮🇹 Jannik Sinner's 2024 deserves immediate mention as one of the closest modern approaches to that all-time mark: <strong className="!text-amber-300">53</strong> wins on hard courts with a 73–6 overall, with hard-court titles at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href={getTourneyHref({ slug: 'cincinnati-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link>, the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, <Link href={getTourneyHref({ slug: 'shanghai' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and the <Link href={getTourneyHref({ slug: 'atp-finals' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>, confirming that his rise to the top was driven above all by hard-court consistency.
          </p>
          <p>
            Another standout modern entry is 🇷🇺 Daniil Medvedev in 2023, credited with <strong className="!text-amber-300">49</strong> hard-court wins in an 84-match season overall. His year was defined by an enormous hard-court workload — <Link href={getTourneyHref({ slug: 'rotterdam' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam</Link>, <Link href={getTourneyHref({ slug: 'doha' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha</Link>, <Link href={getTourneyHref({ slug: 'dubai' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai</Link> and <Link href={getTourneyHref({ slug: 'miami-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link> all ended in titles — making that campaign one of the clearest examples of a specialist-shaped hard-court season in the contemporary ATP game.
          </p>
        </div>
      )}
      {isMostGrassCourtWinsInSingleSeason && topGrassSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The Open Era record for Most Grass-Court Wins in a Single Season belongs to <span className="inline-flex items-center gap-2">{topGrassSeason.ioc && <Flag ioc={topGrassSeason.ioc} className="w-4 h-3" />}{topGrassSeason.player_name}</span>, who recorded <strong className="!text-amber-300">{topGrassSeason.total_wins}</strong> grass-court wins in {topGrassSeason.year}. That total reflects a very different grass calendar: in 1970, John Newcombe could build wins across events such as the <Link href={getTourneyHref({ slug: 'australian-round-robin' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Round Robin</Link>, <Link href={getTourneyHref({ slug: 'melbourne' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Melbourne</Link>, the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'sydney' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sydney</Link>, <Link href={getTourneyHref({ slug: 'bristol' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bristol</Link>, <Link href={getTourneyHref({ slug: 'queens-club' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen's Club</Link>, <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, Newport-1, <Link href={getTourneyHref({ slug: 'hoylake' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hoylake</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>.
          </p>
          <p>
            Grass-court campaigns are normally shorter than hard- or clay-court seasons, so the record is shaped as much by opportunity as by dominance. Older seasons could include the Australian and US swings on grass, while modern players usually have to rely on a compact run around <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and a small set of warm-up events.
          </p>
          {secondGrassSeason && (
            <p>
              Behind the record season comes <span className="inline-flex items-center gap-2">{secondGrassSeason.ioc && <Flag ioc={secondGrassSeason.ioc} className="w-4 h-3" />}{secondGrassSeason.player_name}</span>, who recorded <strong className="!text-amber-300">{secondGrassSeason.total_wins}</strong> grass-court wins in {secondGrassSeason.year}. Laver's 1969 total was part of his calendar-year Grand Slam season, and his grass haul included titles at the <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>.
            </p>
          )}
          {thirdGrassSeason && (
            <p>
              Another high-volume grass season belongs to <span className="inline-flex items-center gap-2">{thirdGrassSeason.ioc && <Flag ioc={thirdGrassSeason.ioc} className="w-4 h-3" />}{thirdGrassSeason.player_name}</span>, with <strong className="!text-amber-300">{thirdGrassSeason.total_wins}</strong> grass-court wins in {thirdGrassSeason.year}. Ashe's run culminated at the first US Open of the Open Era, where he won the grass-court title at Forest Hills and became the first Black man to win a Grand Slam singles title.
            </p>
          )}
          <p>
            In the modern calendar, a grass-court season needs near-perfect efficiency to reach the top of this list: deep runs at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, strong warm-up results at events such as <Link href={getTourneyHref({ slug: 'halle' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link> or <Link href={getTourneyHref({ slug: 'queens-club' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen's Club</Link>, and very little margin for early losses.
          </p>
        </div>
      )}
      {isMostCarpetCourtWinsInSingleSeason && topCarpetSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The Open Era record for Most Carpet-Court Wins in a Single Season belongs to <span className="inline-flex items-center gap-2">{topCarpetSeason.ioc && <Flag ioc={topCarpetSeason.ioc} className="w-4 h-3" />}{topCarpetSeason.player_name}</span>, who recorded <strong className="!text-amber-300">{topCarpetSeason.total_wins}</strong> carpet-court wins in {topCarpetSeason.year}. It is a record from the peak indoor era, when carpet was still a major part of the late-season calendar and rewarded players who could win quickly on low-bouncing courts.
          </p>
          <p>
            Carpet seasons were very different from modern hard-court schedules. The surface favored first-strike tennis, sharp returning, net pressure and quick adjustment indoors, so high totals usually came from players who could keep winning across a compressed run of events rather than from one long stretch at a single tournament.
          </p>
          {secondCarpetSeason && (
            <p>
              Behind the record season comes <span className="inline-flex items-center gap-2">{secondCarpetSeason.ioc && <Flag ioc={secondCarpetSeason.ioc} className="w-4 h-3" />}{secondCarpetSeason.player_name}</span>, who recorded <strong className="!text-amber-300">{secondCarpetSeason.total_wins}</strong> carpet-court wins in {secondCarpetSeason.year}. That kind of total required repeated deep indoor runs, often against specialists who were built for fast courts and short points.
            </p>
          )}
          {thirdCarpetSeason && (
            <p>
              Another major carpet season belongs to <span className="inline-flex items-center gap-2">{thirdCarpetSeason.ioc && <Flag ioc={thirdCarpetSeason.ioc} className="w-4 h-3" />}{thirdCarpetSeason.player_name}</span>, with <strong className="!text-amber-300">{thirdCarpetSeason.total_wins}</strong> carpet-court wins in {thirdCarpetSeason.year}. Seasons like this show how much the old indoor circuit could shape a player's annual match-win profile.
            </p>
          )}
          <p>
            In this record, the milestone is pure surface-specific volume: the leader combined fast-court efficiency with enough indoor opportunities to build a total that is difficult to compare directly with today's ATP calendar, where carpet no longer plays the same role.
          </p>
        </div>
      )}
      {isMostClayCourtWinsInSingleSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The Open Era record for Most Clay-Court Wins in a Single Season belongs to 🇦🇷 Guillermo Vilas, who recorded <strong className="!text-amber-300">98</strong> clay-court wins in 1977 — the highest single-season clay total in men's tennis. His campaign was one of the most extreme feats of clay-court endurance in men's tennis history: a 53-match clay winning streak, two Grand Slam titles at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href={getTourneyHref({ slug: 'us-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> (then played on clay), 16 titles overall, and a schedule built almost entirely around slow red dirt.
          </p>
          <p>
            The closest approach from the modern ATP Tour era belongs to 🇦🇹 Thomas Muster in 1995, who compiled <strong className="!text-amber-300">65</strong> clay-court wins — the highest total of the post-1990 professional era. Muster won the <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> title that year as the culmination of an extraordinary clay season, with victories at <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> and <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> among his run of clay titles. His 1995 campaign was total clay dominance: grinding baseline tennis taken to its logical extreme.
          </p>
          <p>
            🇪🇸 Rafael Nadal holds multiple entries in the upper reaches of this list across different seasons. His clay seasons were defined not by sheer volume alone but by a near-perfect winning percentage — seasons like 2005, 2008, and 2013 saw him go through <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, <Link href={getTourneyHref({ slug: 'barcelona' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> and <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> with minimal losses. His <strong className="!text-amber-300">50</strong> clay wins in 2005 — his debut Roland Garros–winning season — were achieved with one of the highest win rates ever recorded on clay, while in 2010 he finished the clay season at <strong className="!text-amber-300">100%</strong>, winning all <strong className="!text-amber-300">22</strong> matches he played on the surface.
          </p>
          <p>
            What separates the all-time clay-court records from their hard-court equivalents is context: clay seasons are shorter and deeper, meaning every match demands more physical and tactical output. Vilas' total belongs to a different era of tennis, but Muster's <strong className="!text-amber-300">65</strong> wins represent the modern ceiling — and it has never been surpassed since 1995, despite the dominance of Nadal and the depth of the modern ATP.
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
        title="Top Wins in the Same Season"
      >
        {renderTable(topSameTournamentWins)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
