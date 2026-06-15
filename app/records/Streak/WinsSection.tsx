"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from '@/components/Flag';
import RecordNarrative from "../RecordNarrative";
import { playerSurfaceOrMatchesUrl } from "../nav";
import { getTourneyHref } from '@/lib/utils';

interface WinsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
  selectedRounds?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  initialData?: Streak[];
  description?: string;
}

interface Streak {
  player_id: string;
  player_name?: string;
  player_ioc?: string;
  tourney_level?: string;
  total_wins: number;
  match_ids: number[];
}

interface Match {
  id: number;
  tourney_date: string;
  tourney_name: string;
  round: string;
  opponent_name: string;
  loser_ioc?: string;
  score: string;
}

const viewLimit = 20;

export default function WinsSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
  selectedRounds,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  initialData,
  description,
}: WinsSectionProps) {
  const [streaks, setStreaks] = useState<Streak[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const levelsArr = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  useEffect(() => setPage(1), [surfacesArr, levelsArr, selectedBestOf, selectedRounds]);

  const fetchData = async (limit = 100, force = false) => {
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const query = new URLSearchParams();
      surfacesArr.forEach((s) => query.append("surface", s));
      levelsArr.forEach((l) => query.append("level", l));
      if (selectedBestOf !== null) query.append("best_of", selectedBestOf.toString());
      if (selectedRounds) {
        if (selectedRounds === "All") {
          ["R128","R64","R32","R16","QF","SF","F"].forEach(r => query.append("round", r));
        } else {
          query.append("round", selectedRounds);
        }
      }
      query.append("limit", String(limit));

      const res = await fetch(`/api/records/streak/wins${query.toString() ? `?${query}` : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawData = await res.json();
      let streakList: Streak[] = [];

      if (Array.isArray(rawData)) {
        streakList = rawData;
      } else if (rawData && typeof rawData === 'object') {
        streakList = Object.values(rawData)
          .flatMap((v: any) => (Array.isArray(v) ? v : Object.values(v)))
          .flat() as Streak[];
      }

      streakList.sort((a, b) => b.total_wins - a.total_wins);
      setStreaks(streakList);
    } catch (err: any) {
      setError(err?.message || 'Error while loading win streaks.');
      setStreaks([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
      if (fetchEnabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRequestId, surfacesArr.join(','), levelsArr.join(','), selectedBestOf, selectedRounds]);

  const totalPages = Math.ceil(streaks.length / viewLimit);

  const isMasters1000Only = selectedLevels?.size === 1 && selectedLevels.has('M') && selectedSurfaces.size === 0 && !selectedRounds && selectedBestOf == null;
  const isHardCourtWinStreak = description === 'Longest Winning Streak on Hard Court';
  const isClayCourtWinStreak = description === 'Longest Winning Streak on Clay';

  const currentData = useMemo(() => {
    const start = (page - 1) * viewLimit;
    return streaks.slice(start, start + viewLimit);
  }, [streaks, page]);

  const linkParams: Record<string, string | string[] | number | undefined> = {};
  if (surfacesArr.length) linkParams.surface = surfacesArr;
  if (levelsArr.length) linkParams.level = levelsArr;
  if (selectedBestOf !== null) linkParams.best_of = selectedBestOf;
  if (selectedRounds) linkParams.round = selectedRounds === "All" ? undefined : selectedRounds;

  const openMatchesModal = async (matchIds: number[]) => {
    setShowMatchesModal(true);
    setMatches([]);
    setMatchesError(null);
    setMatchesLoading(true);

    try {
      const res = await fetch(`/api/records/streak/streakwins?ids=${matchIds.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatches(data);
    } catch (err: any) {
      setMatchesError(err?.message || 'Error while loading matches.');
    } finally {
      setMatchesLoading(false);
    }
  };

  const renderTable = (list: Streak[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">{!hasFetched ? 'Select data' : 'No data available.'}</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr key={`${s.player_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={s.player_ioc ?? undefined} className="w-4 h-3 inline-block" />
                      <Link href={playerSurfaceOrMatchesUrl((s as any).slug ?? String(s.player_id), linkParams as any)} className="text-indigo-300 hover:underline">
                        {s.player_name || `Player ${s.player_id}`}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.total_wins}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openMatchesModal(s.match_ids)}
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
    <section className="mb-0">
      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>} 
      {description === 'Longest Winning Streak' && <RecordNarrative>
        <p>
          At the top stands <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Bjorn Borg</Link></span>, whose legendary runs of <strong className="!text-amber-300">49</strong> and <strong className="!text-amber-300">48</strong> consecutive wins still represent one of the highest standards of consistency ever reached in men's tennis. His 49-match run began at the Davis Cup Europe zone playoff against Ireland on <strong className="!text-sky-300">17 March 1978</strong>, when he beat Michael Hickey; it also included a walkover, and the last win came against Vitas Gerulaitis in the <Link href={getTourneyHref({ slug: 'us-open', year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1978 US Open</Link> semi-final, before the streak ended in the final against Jimmy Connors. His 48-match run began at the Davis Cup Europe final against Czechoslovakia on <strong className="!text-sky-300">14 September 1979</strong>, when he beat Ivan Lendl; it also included a walkover, and the last win came against Gene Mayer at the <Link href={getTourneyHref({ slug: 'world-team-championship', year: 1980 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1980 Nations Cup</Link>, before the streak ended in the semi-final against Guillermo Vilas.
        </p>
        <p>
          Just behind him is <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-vilas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span>, whose <strong className="!text-amber-300">46</strong>-match winning streak in <strong className="!text-sky-300">1977</strong> began at <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbuhel</Link> on <strong className="!text-sky-300">11 July 1977</strong> against Alvin Gardiner; the last win came against Eric Deblicker at <Link href={getTourneyHref({ slug: 'aix-en-provence', year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Aix-en-Provence</Link>, and the streak ended in the final against Ilie Nastase. Then come other giants of the game: <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href="/players/ivan-lendl" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span>, with <strong className="!text-amber-300">44</strong> straight wins between <strong className="!text-sky-300">1981 and 1982</strong>, starting in <Link href={getTourneyHref({ slug: 'madrid', year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link> on <strong className="!text-sky-300">29 September 1981</strong> against Juan Avendano; the last win came against Raul Ramirez in <Link href={getTourneyHref({ slug: 'indian-wells-masters', year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">La Quinta</Link>, and the streak ended in the final against Yannick Noah. <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>'s <strong className="!text-amber-300">43</strong>-match streak from late <strong className="!text-sky-300">2010 to the 2011</strong> French Open began in Davis Cup against Gilles Simon on <strong className="!text-sky-300">3 December 2010</strong>; the last win came against Richard Gasquet, and the streak ended in the <Link href={getTourneyHref({ slug: 'roland-garros', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> semi-final against Roger Federer.
        </p>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/john-mcenroe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span> followed with <strong className="!text-amber-300">42</strong> consecutive victories during his almost untouchable <strong className="!text-sky-300">1984</strong> season, starting at the <Link href={getTourneyHref({ slug: 'atp-finals', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters</Link> on <strong className="!text-sky-300">10 January 1984</strong> against Johan Kriek; the last win came against Jimmy Connors at <Link href={getTourneyHref({ slug: 'roland-garros', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, and the streak ended in the final against Ivan Lendl. <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> put together a <strong className="!text-amber-300">41</strong>-match winning streak between <strong className="!text-sky-300">2006 and 2007</strong>, beginning at the <Link href={getTourneyHref({ slug: 'us-open', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> on <strong className="!text-sky-300">28 August 2006</strong> against Jimmy Wang; the last win came in the <Link href={getTourneyHref({ slug: 'dubai', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai</Link> final against Mikhail Youzhny, and the streak ended at <Link href={getTourneyHref({ slug: 'indian-wells-masters', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link> against Guillermo Canas.
        </p>
        <p>
          Each of these streaks tells a different story. Borg’s dominance stretched across clay and grass. Vilas turned 1977 into a monumental campaign. Lendl became a machine of consistency. Djokovic’s 2011 run redefined modern dominance. McEnroe played months of almost unplayable tennis. Federer combined elegance, efficiency and control at a level few players have ever matched.
        </p>
      </RecordNarrative>}
      {description === 'Longest Winning Streak at Grand Slams' && <RecordNarrative>
        <p>
          The longest Grand Slam winning streak in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">30</strong> consecutive wins at majors between <Link href={getTourneyHref({ slug: 'wimbledon', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2015</Link> and <Link href={getTourneyHref({ slug: 'wimbledon', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2016</Link>. The run began in the first round of Wimbledon 2015, where Djokovic beat <strong>Philipp Kohlschreiber</strong> 6-4, 6-4, 6-4, and ended in the third round of Wimbledon 2016, where <strong>Sam Querrey</strong> defeated him 7-6(6), 6-1, 3-6, 7-6(5). During the streak, Djokovic won <Link href={getTourneyHref({ slug: 'wimbledon', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2015</Link>, the <Link href={getTourneyHref({ slug: 'us-open', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2015</Link>, the <Link href={getTourneyHref({ slug: 'australian-open', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2016</Link> and <Link href={getTourneyHref({ slug: 'roland-garros', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2016</Link>, completing the non-calendar-year Grand Slam.
        </p>
        <p>
          Second is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span>, with <strong className="!text-amber-300">29</strong> straight Grand Slam wins from the <Link href={getTourneyHref({ slug: 'australian-open', year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1969 Australian Open</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1970</Link>. His streak began at the 1969 Australian Open, where he opened with a win over <strong>Massimo Di Domenico</strong> 6-2, 6-3, 6-3, and ended in the fourth round of Wimbledon 1970, when <strong>Roger Taylor</strong> beat him 4-6, 6-4, 6-2, 6-1. The run included Laver's 1969 calendar-year Grand Slam.
        </p>
      </RecordNarrative>}
      {isMasters1000Only && <RecordNarrative>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><Link href="/players/jannik-sinner" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jannik Sinner</Link></span>'s run of <strong className="!text-amber-300">34 consecutive wins</strong> in ATP Masters 1000 events has now entered tennis history: by winning in Rome on <strong className="!text-sky-300">17 May 2026</strong>, he moved past <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>'s previous record of 31 straight Masters 1000 victories, set in 2011 from Indian Wells to Cincinnati.
        </p>
        <p>
          The streak began after Sinner's last Masters 1000 defeat at <Link href={getTourneyHref({ slug: 'shanghai-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2025</Link> and has included a remarkable sequence of titles: <Link href={getTourneyHref({ slug: 'paris-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2025</Link>, <Link href={getTourneyHref({ slug: 'indian-wells', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2026</Link>, <Link href={getTourneyHref({ slug: 'miami', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2026</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2026</Link>, <Link href={getTourneyHref({ slug: 'madrid', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 2026</Link> and <Link href={getTourneyHref({ slug: 'rome-masters', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2026</Link>, making him the first man to win six consecutive Masters 1000 tournaments.
        </p>
        <p>
          In doing so, Sinner had already equalled Djokovic's historic mark with his win over <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><Link href="/players/andrea-pellegrino" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andrea Pellegrino</Link></span>, but by defeating <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><Link href="/players/andrey-rublev" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andrey Rublev</Link></span> he moved out alone at the top of the all-time Masters 1000 streak list.
        </p>
        <p>
          Along the way, Sinner surpassed <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>'s best Masters 1000 streak of 29 wins and Djokovic's second-best run of 30, while also leaving behind other legendary runs such as Djokovic and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>'s 23-match runs, Djokovic's 22-match run, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/pete-sampras" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Pete Sampras</Link></span>' 19-match streak, and Nadal's two separate 18-match runs.
        </p>
        <p>
          What makes the streak even more extraordinary is the variety of conditions in which it has been achieved, spanning indoor hard courts, outdoor hard courts and clay, underlining Sinner's dominance across every surface at Masters 1000 level.
        </p>
      </RecordNarrative>}
      {isClayCourtWinStreak && (
        <RecordNarrative>
          <p className="mb-4">
            The Open Era record for Longest Winning Streak on Clay belongs to <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>, whose <strong className="!text-amber-300">81</strong>-match clay-court winning streak stretched from <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2005</Link> to <Link href={getTourneyHref({ slug: 'hamburg', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hamburg 2007</Link>. It opened at Monte-Carlo with a first-round win over Gael Monfils, 6-3, 6-2, and it ended in the Hamburg final, where Roger Federer beat him 2-6, 6-2, 6-0. In between, Nadal built the run through the heart of the clay season, with titles at Monte-Carlo, Barcelona, Rome and Roland Garros.
          </p>
          <p className="mb-4">
            Next is <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-vilas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span>, whose <strong className="!text-amber-300">53</strong>-match clay streak in <strong className="!text-sky-300">1977</strong> started at <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbuhel</Link> and ended at <span className="!text-orange-300">Raquette d'Or</span>, underlining how far clay-court dominance could extend in the Open Era.
          </p>
          <p className="mb-4">
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Bjorn Borg</Link></span>, who produced a <strong className="!text-amber-300">48</strong>-match clay winning streak between <strong className="!text-sky-300">1978 and 1979</strong>, showcasing his dominance during his peak years when he ruled <Link href={getTourneyHref({ slug: 'roland-garros', year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and became the benchmark for clay-court excellence before Nadal.
          </p>
          <p className="mb-4">
            <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><Link href="/players/thomas-muster" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Thomas Muster</Link></span> follows with <strong className="!text-amber-300">40</strong> consecutive wins on clay in <strong className="!text-sky-300">1995</strong>, one of the most dominant single-season runs ever on the surface, as he captured multiple titles and established himself as the best clay-court player of that year.
          </p>
          <p className="mt-4">
            Together, these streaks define the highest marks of sustained performance on clay: Nadal at <strong className="!text-amber-300">81</strong>, Vilas at <strong className="!text-amber-300">53</strong>, Borg at <strong className="!text-amber-300">48</strong>, and Muster at <strong className="!text-amber-300">40</strong>.
          </p>
        </RecordNarrative>
      )}
      {isHardCourtWinStreak && (
        <RecordNarrative>
          <p className="mb-4">
            The longest hard-court winning streak in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, who won <strong className="!text-amber-300">56</strong> consecutive matches on hard courts between <strong className="!text-sky-300">February 2005 and March 2006</strong>. The run began at <Link href={getTourneyHref({ slug: 'rotterdam', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam 2005</Link>, where Federer beat Bohdan Ulihrach in the first round, and ended in the <Link href={getTourneyHref({ slug: 'dubai', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai 2006</Link> final, where <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> beat him 2-6, 6-4, 6-4.
          </p>
          <p className="mb-4">
            During the streak, Federer won hard-court titles in Rotterdam, Dubai, Indian Wells, Miami, Cincinnati, the US Open, Bangkok, Doha and the Australian Open, building a record that combined volume, control and repeated success across the biggest hard-court events of the season.
          </p>
          <p className="mb-4">
            Second on the list is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">47</strong> consecutive hard-court wins between <strong className="!text-sky-300">1974 and 1975</strong>. His streak started at <Link href={getTourneyHref({ slug: 'salt-lake-city', year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Salt Lake City 1974</Link>, after a first-round bye, with a 6-2, 6-3 win over Christian Kuhnke in the round of 16, and it ended in the <Link href={getTourneyHref({ slug: 'stockholm', year: 1975 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm 1975</Link> final, where Adriano Panatta defeated him 4-6, 6-3, 7-5.
          </p>
          <p className="mb-4">
            Third on the hard-court list is Federer again, with <strong className="!text-amber-300">36</strong> straight wins from the <Link href={getTourneyHref({ slug: 'us-open', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2006 US Open</Link> to <Link href={getTourneyHref({ slug: 'indian-wells-masters', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2007</Link>. That run began with a 6-4, 6-1, 6-0 win over Jimmy Wang in the first round of the US Open and was stopped by Guillermo Cañas in the second round of Indian Wells.
          </p>
          <p>
            Novak Djokovic follows with a <strong className="!text-amber-300">35</strong>-match hard-court winning streak from <strong className="!text-sky-300">December 2010 to August 2011</strong>. The streak began in the <Link href={getTourneyHref({ slug: 'davis-cup', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2010 Davis Cup final</Link> in Belgrade, where Djokovic beat Gilles Simon 6-3, 6-1, 7-5, and ended in the <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2011 Cincinnati final</Link>, when Andy Murray led 6-4, 3-0 before Djokovic retired with a shoulder problem.
          </p>
          <p className="mt-4">
            Together, these streaks define the highest marks of sustained performance on hard courts: Federer at <strong className="!text-amber-300">56</strong>, Connors at <strong className="!text-amber-300">47</strong>, Federer again at <strong className="!text-amber-300">36</strong>, and Djokovic at <strong className="!text-amber-300">35</strong>.
          </p>
        </RecordNarrative>
      )}
      {description === 'Longest Winning Streak on Grass' && <RecordNarrative>
        <p>
          The longest ATP grass-court winning streak belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">65</strong> consecutive wins between <Link href={getTourneyHref({ slug: 'halle', year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2003</Link> and <Link href={getTourneyHref({ slug: 'wimbledon', year: 2008 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2008</Link>. The streak began in the first round of Halle 2003, when Federer beat <strong>Sargis Sargsian</strong> 7-5, 6-1, and ended in the 2008 Wimbledon final, where <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> defeated him 6-4, 6-4, 6-7(5), 6-7(8), 9-7. During that run, Federer won five Halle titles and five Wimbledon titles before losing the 2008 Wimbledon final.
        </p>
        <p>
          Second is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Bjorn Borg</Link></span>, with <strong className="!text-amber-300">41</strong> straight wins on grass from <Link href={getTourneyHref({ slug: 'wimbledon', year: 1976 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1976</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1981</Link>. His streak started in the first round of Wimbledon 1976, with a 6-3, 6-3, 6-1 win over <strong>David Lloyd</strong>, and ended in the 1981 Wimbledon final, when <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/john-mcenroe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span> beat him 4-6, 7-6(1), 7-6(4), 6-4. All 41 wins came at Wimbledon, across five consecutive titles from 1976 to 1980.
        </p>
        <p>
          Third is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">34</strong> consecutive grass-court wins from <Link href={getTourneyHref({ slug: 'wimbledon', year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2018</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2023</Link>. The run began in the first round of Wimbledon 2018, when Djokovic beat <strong>Tennys Sandgren</strong> 6-3, 6-1, 6-2, and was stopped in the 2023 Wimbledon final, where <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/carlos-alcaraz" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Carlos Alcaraz</Link></span> won 1-6, 7-6(6), 6-1, 3-6, 6-4. Djokovic’s streak covered four Wimbledon titles: 2018, 2019, 2021 and 2022.
        </p>
        <p>
          Fourth is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span>, with <strong className="!text-amber-300">24</strong> straight wins on grass between 1969 and 1970. The streak began at <Link href={getTourneyHref({ slug: 'wimbledon', year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1969</Link>, where Laver opened with a 6-1, 6-2, 6-2 win over <strong>Nicola Pietrangeli</strong>, and ended in the <Link href={getTourneyHref({ slug: 'bristol', year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1970 Bristol final</Link>, where <strong>Nikola Pilić</strong> defeated him 6-3, 1-6, 6-3. The run included the 1969 Wimbledon and 1969 US Open titles, when the US Open was still played on grass.
        </p>
        <p>
          This grass-court hierarchy is therefore led by Federer at 65, followed by Borg at 41, Djokovic at 34 and Laver at 24.
        </p>
      </RecordNarrative>}


      {error && <div className="mb-2 text-center text-sm text-red-500">{error}</div>}

      <div className="mb-0 flex justify-end">
        {streaks.length > viewLimit && (
          <button onClick={() => setShowModal(true)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-300">Loading</div>
      ) : streaks.length === 0 ? (
        <div className="py-8 text-center text-gray-300">No win streaks found.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * viewLimit)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Consecutive Win Streaks">
        {renderTable(streaks, 0)}
      </Modal>

      <Modal show={showMatchesModal} onClose={() => setShowMatchesModal(false)} title="Matches in Win Streak">
        {matchesLoading ? (
          <div className="py-8 text-center text-gray-300">Loading matches</div>
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
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Round</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Opponent</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  return (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                      <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.tourney_date}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.tourney_name}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.round}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200 flex items-center justify-center gap-2">
                        <Flag ioc={m.loser_ioc ?? undefined} className="w-4 h-3 inline-block" />
                        {m.opponent_name}
                      </td>
                      <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  );
}
