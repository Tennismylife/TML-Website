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
      {description === 'Longest Win Streak' && <RecordNarrative>
        <p>
          At the top stands <strong>Björn Borg</strong>, whose legendary runs of 49 and 48 consecutive wins still represent one of the highest standards of consistency ever reached in men’s tennis. Just behind him is <strong>Guillermo Vilas</strong>, whose 46-match winning streak in 1977 remains one of the defining achievements of that extraordinary season.
        </p>
        <p>
          Then come other giants of the game: <strong>Ivan Lendl</strong>, with 44 straight wins between 1981 and 1982, and <strong>Novak Djokovic</strong>, whose 43-match streak from late 2010 to the 2011 French Open became one of the most iconic runs of the modern era.
        </p>
        <p>
          <strong>John McEnroe</strong> followed with 42 consecutive victories during his almost untouchable 1984 season, while <strong>Roger Federer</strong> put together a 41-match winning streak between 2006 and 2007, at the heart of one of the most dominant periods ever seen in the sport.
        </p>
        <p>
          Each of these streaks tells a different story. Borg’s dominance stretched across clay and grass. Vilas turned 1977 into a monumental campaign. Lendl became a machine of consistency. Djokovic’s 2011 run redefined modern dominance. McEnroe played months of almost unplayable tennis. Federer combined elegance, efficiency and control at a level few players have ever matched.
        </p>
        <p>
          These streaks are also fragile by nature. A bad day, a surface change, an inspired opponent, a lost tie-break — any of these can end a run instantly. That is why reaching 20 straight wins is already a sign of elite form. Crossing 30 means entering history. Going beyond 40 means stepping into a territory reserved for the greatest dominators the ATP Tour has ever seen.
        </p>
      </RecordNarrative>}
      {description === 'Longest Winning Streak at Grand Slams' && <RecordNarrative>
        <p>
          The longest Grand Slam winning streak in the Open Era belongs to <strong>Novak Djokovic</strong>, with 30 consecutive wins at majors between Wimbledon 2015 and Wimbledon 2016. The run began in the first round of Wimbledon 2015, where Djokovic beat <strong>Philipp Kohlschreiber</strong> 6-4, 6-4, 6-4, and ended in the third round of Wimbledon 2016, where <strong>Sam Querrey</strong> defeated him 7-6(6), 6-1, 3-6, 7-6(5).
        </p>
        <p>
          During the streak, Djokovic won Wimbledon 2015, the US Open 2015, the Australian Open 2016 and Roland Garros 2016, completing the non-calendar-year Grand Slam.
        </p>
        <p>
          Second is <strong>Rod Laver</strong>, with 29 straight Grand Slam wins from the 1969 Australian Open to Wimbledon 1970. His streak began at the 1969 Australian Open, where he opened with a win over <strong>Massimo Di Domenico</strong> 6-2, 6-3, 6-3, and ended in the fourth round of Wimbledon 1970, when <strong>Roger Taylor</strong> beat him 4-6, 6-4, 6-2, 6-1.
        </p>
        <p>
          The run included Laver’s 1969 calendar-year Grand Slam.
        </p>
        <p>
          Third is <strong>Roger Federer</strong>, with 27 consecutive Grand Slam wins between Wimbledon 2005 and Roland Garros 2006. The streak started in the first round of Wimbledon 2005, where Federer defeated <strong>Paul-Henri Mathieu</strong> 6-4, 6-2, 6-4, and ended in the 2006 Roland Garros final, where <strong>Rafael Nadal</strong> beat him 1-6, 6-1, 6-4, 7-6(4).
        </p>
        <p>
          Federer won Wimbledon 2005, the US Open 2005 and the Australian Open 2006 during the run.
        </p>
        <p>
          Behind them, <strong>Jimmy Connors</strong>, <strong>Rafael Nadal</strong> and <strong>Pete Sampras</strong> are tied at 25 consecutive Grand Slam wins. Connors’ run stretched from the 1974 Australian Open to the 1975 Australian Open final, Nadal’s from Roland Garros 2010 to the 2011 Australian Open quarter-finals, and Sampras’ from Wimbledon 1993 to the 1994 Roland Garros quarter-finals.
        </p>
        <p>
          The Grand Slam hierarchy is therefore led by Djokovic at 30, followed by Laver at 29, Federer at 27, and the group of Connors, Nadal and Sampras at 25. These streaks count only consecutive wins in Grand Slam main-draw matches.
        </p>
      </RecordNarrative>}
      {isMasters1000Only && <RecordNarrative>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Jannik Sinner</span></span>’s run of <strong className="!text-amber-300">32 consecutive wins</strong> in ATP Masters 1000 events has now entered tennis history, because with his victory over <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Andrey Rublev</span></span> in Rome on 14 May 2026 he moved past <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>’s all-time record of 31 straight Masters 1000 victories, set in 2011 from Indian Wells to Cincinnati.
        </p>
        <p>
          The streak began after Sinner’s last Masters 1000 defeat in <Link href={getTourneyHref({ slug: 'shanghai-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2025</Link> and has included a remarkable sequence of titles: <Link href={getTourneyHref({ slug: 'paris-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2025</Link>, <Link href={getTourneyHref({ slug: 'indian-wells', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2026</Link>, <Link href={getTourneyHref({ slug: 'miami', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2026</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2026</Link> and <Link href={getTourneyHref({ slug: 'madrid', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 2026</Link>, making him the first man to win five consecutive Masters 1000 tournaments.
        </p>
        <p>
          In doing so, Sinner had already equalled Djokovic’s historic mark with his win over <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Andrea Pellegrino</span></span>, but by defeating Rublev he now stands alone with the longest Masters 1000 winning streak ever recorded since the series began in 1990.
        </p>
        <p>
          Along the way, Sinner surpassed <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><span>Roger Federer</span></span>’s best Masters 1000 streak of 29 wins and Djokovic’s second-best run of 30, while also leaving behind other legendary runs such as Djokovic and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>’s 23-match runs, Djokovic’s 22-match run, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>’ 19-match streak, and Nadal’s two separate 18-match runs.
        </p>
        <p>
          What makes the streak even more extraordinary is the variety of conditions in which it has been achieved, spanning indoor hard courts, outdoor hard courts and clay, underlining Sinner’s dominance across every surface at Masters 1000 level.
        </p>
      </RecordNarrative>}
      {description === 'Longest Winning Streak on Grass' && <RecordNarrative>
        <p>
          The longest ATP grass-court winning streak belongs to <strong>Roger Federer</strong>, with 65 consecutive wins between Halle 2003 and Wimbledon 2008. The streak began in the first round of Halle 2003, when Federer beat <strong>Sargis Sargsian</strong> 7-5, 6-1, and ended in the 2008 Wimbledon final, where <strong>Rafael Nadal</strong> defeated him 6-4, 6-4, 6-7(5), 6-7(8), 9-7.
        </p>
        <p>
          During that run, Federer won five Halle titles and five Wimbledon titles before losing the 2008 Wimbledon final.
        </p>
        <p>
          Second is <strong>Björn Borg</strong>, with 41 straight wins on grass from Wimbledon 1976 to Wimbledon 1981. His streak started in the first round of Wimbledon 1976, with a 6-3, 6-3, 6-1 win over <strong>David Lloyd</strong>, and ended in the 1981 Wimbledon final, when <strong>John McEnroe</strong> beat him 4-6, 7-6(1), 7-6(4), 6-4. All 41 wins came at Wimbledon, across five consecutive titles from 1976 to 1980.
        </p>
        <p>
          Third is <strong>Novak Djokovic</strong>, with 34 consecutive grass-court wins from Wimbledon 2018 to Wimbledon 2023. The run began in the first round of Wimbledon 2018, when Djokovic beat <strong>Tennys Sandgren</strong> 6-3, 6-1, 6-2, and was stopped in the 2023 Wimbledon final, where <strong>Carlos Alcaraz</strong> won 1-6, 7-6(6), 6-1, 3-6, 6-4. Djokovic’s streak covered four Wimbledon titles: 2018, 2019, 2021 and 2022.
        </p>
        <p>
          Fourth is <strong>Rod Laver</strong>, with 24 straight wins on grass between 1969 and 1970. The streak began at Wimbledon 1969, where Laver opened with a 6-1, 6-2, 6-2 win over <strong>Nicola Pietrangeli</strong>, and ended in the 1970 Bristol final, where <strong>Nikola Pilić</strong> defeated him 6-3, 1-6, 6-3. The run included the 1969 Wimbledon and 1969 US Open titles, when the US Open was still played on grass.
        </p>
        <p>
          This grass-court hierarchy is therefore led by Federer at 65, followed by Borg at 41, Djokovic at 34 and Laver at 24.
        </p>
      </RecordNarrative>}
      {description === 'Longest Winning Streak on Carpet' && <RecordNarrative>
        <p>
          The longest carpet-court winning streak in the Open Era belongs to <strong>John McEnroe</strong>, with 75 consecutive wins on carpet between September 1983 and April 1985. The run began in the 1983 Davis Cup relegation play-off in Dublin, where McEnroe beat <strong>Sean Sorensen</strong> 6-3, 6-2, 6-2 on indoor carpet, and ended at the 1985 WCT Finals in Dallas, where <strong>Joakim Nyström</strong> defeated him 6-4, 7-6, 6-3 in the quarter-finals.
        </p>
        <p>
          Second is <strong>Ivan Lendl</strong>, with 66 straight wins on carpet between October 1981 and February 1983. His streak started at Basel 1981, with a 6-4, 6-1 first-round win over <strong>Steve Denton</strong>, and ended in the 1983 Philadelphia final, where <strong>John McEnroe</strong> beat him 4-6, 7-6, 6-4, 6-3.
        </p>
      </RecordNarrative>}
      {isHardCourtWinStreak && (
        <RecordNarrative>
          <p className="mb-4">
            The longest hard-court winning streak in the Open Era belongs to <strong>Roger Federer</strong>, who won 56 consecutive matches on hard courts between February 2005 and March 2006. The run began at Rotterdam 2005, with a 6-3, 6-4 win over Bohdan Ulihrach in the first round, and ended in the 2006 Dubai final, where <strong>Rafael Nadal</strong> beat him 2-6, 6-4, 6-4.
          </p>
          <p className="mb-4">
            During the streak, Federer won hard-court titles in Rotterdam, Dubai, Indian Wells, Miami, Cincinnati, the US Open, Bangkok, Doha and the Australian Open. [flashscore.com], [atptour.com], [tennis365.com]
          </p>
          <p className="mb-4">
            Second on the list is <strong>Jimmy Connors</strong>, with 47 consecutive hard-court wins between 1974 and 1975. His streak started at Salt Lake City 1974, after a first-round bye, with a 6-2, 6-3 win over Christian Kuhnke in the round of 16. It ended in the 1975 Stockholm final, where <strong>Adriano Panatta</strong> defeated him 4-6, 6-3, 7-5.
          </p>
          <p className="mb-4">
            Federer also owns the third-longest hard-court streak, with 36 straight wins from the 2006 US Open to Indian Wells 2007. That run began with a 6-4, 6-1, 6-0 win over Jimmy Wang in the first round of the 2006 US Open and was stopped by <strong>Guillermo Cañas</strong>, who beat Federer 7-5, 6-2 in the second round of Indian Wells 2007.
          </p>
          <p>
            Novak Djokovic follows with a 35-match hard-court winning streak from December 2010 to August 2011. The streak began in the 2010 Davis Cup final in Belgrade, where Djokovic beat Gilles Simon 6-3, 6-1, 7-5. It ended in the 2011 Cincinnati final, when Andy Murray led 6-4, 3-0 before Djokovic retired with a shoulder problem.
          </p>
          <p className="mt-4">
            Together, these streaks define the highest marks of sustained performance on hard courts: Federer at 56, Connors at 47, Federer again at 36, and Djokovic at 35.
          </p>
        </RecordNarrative>
      )}


      {error && <div className="mb-2 text-center text-sm text-red-500">{error}</div>}

      <div className="mb-0 flex justify-end">
        {streaks.length > viewLimit && (
          <button onClick={() => setShowModal(true)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-300">Loading…</div>
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
