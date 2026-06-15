"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import Flag from "@/components/Flag";
import RecordNarrative from "../RecordNarrative";
import { createSlug, getPlayerHrefWithTab, getTourneyHref } from "@/lib/utils";
import { playerSurfaceHref, surfaceFromSelection } from "../nav";

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
  selectedRounds?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  initialData?: StreakByTournament[];
  description?: string;
}

interface StreakByTournament {
  player?: { id: string; name: string; ioc: string };
  maxStreak: number;
  event_ids: string[];
}

interface TournamentDetail {
  event_id: string;
  tourney_name: string;
  tourney_date?: string;
  year?: string | number;
  tourney_year?: string;
}

const viewLimit = 20;

export default function RoundSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
  selectedRounds,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  initialData,
  description,
}: RoundSectionProps) {
  const normalizeStreaks = (data: any): StreakByTournament[] => {
    if (Array.isArray(data)) return data as StreakByTournament[];
    if (data && Array.isArray(data.streaks)) return data.streaks as StreakByTournament[];
    return [];
  };

  const [streaks, setStreaks] = useState<StreakByTournament[]>(normalizeStreaks(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetail[]>([]);
  const [tournamentModalPlayer, setTournamentModalPlayer] = useState<string>("");
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);

  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const surfaceLink = surfaceFromSelection(selectedSurfaces);
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

      const res = await fetch(`/api/records/streak/rounds${query.toString() ? `?${query}` : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setStreaks(normalizeStreaks(data));
    } catch (err: any) {
      setError(err?.message || "Error while loading consecutive rounds data.");
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

  const currentData = useMemo(() => {
    const start = (page - 1) * viewLimit;
    return streaks.slice(start, start + viewLimit);
  }, [streaks, page]);

  const openTournamentModal = async (playerId: string, eventIds: string[], playerName?: string) => {
    setShowTournamentModal(true);
    setTournamentDetails([]);
    setTournamentError(null);
    setTournamentLoading(true);
    setTournamentModalPlayer(playerName || "");

    try {
      const res = await fetch(`/api/records/streak/streaktournaments?player_id=${encodeURIComponent(playerId)}&event_ids=${encodeURIComponent(eventIds.join(','))}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resJson = await res.json();
      let tournamentsData: TournamentDetail[] = [];

      // Prefer serialized form if present (more reliable in some server responses)
      if (resJson && typeof resJson === 'object' && typeof (resJson as any).tournaments_serialized === 'string') {
        try {
          tournamentsData = JSON.parse((resJson as any).tournaments_serialized) as TournamentDetail[];
        } catch (e) {
          tournamentsData = [];
        }
      } else if (Array.isArray((resJson as any).tournaments)) {
        tournamentsData = (resJson as any).tournaments as TournamentDetail[];
      } else if (typeof (resJson as any).tournaments === 'string') {
        try {
          tournamentsData = JSON.parse((resJson as any).tournaments) as TournamentDetail[];
        } catch (e) {
          tournamentsData = [];
        }
      } else if (Array.isArray(resJson)) {
        tournamentsData = resJson as TournamentDetail[];
      } else if (resJson && typeof resJson === 'object') {
        // Fallback: object map -> take values
        const val = Object.values(resJson as any);
        tournamentsData = Array.isArray(val) ? (val as TournamentDetail[]) : [];
      }

      setTournamentDetails(tournamentsData);
    } catch (err: any) {
      setTournamentError(err?.message || "Error while loading tournament details.");
    } finally {
      setTournamentLoading(false);
    }
  };

  const renderTable = (list: StreakByTournament[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournaments</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Details</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-8 text-center text-gray-300">{!hasFetched ? "Select data" : "No data available."}</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;
              return (
                <tr key={`${s.player?.id ?? "player"}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={s.player?.ioc ?? undefined} className="w-4 h-3" />
                      {s.player ? (
                        <Link href={playerSurfaceHref((s.player as any).slug ?? String(s.player.id), surfaceLink)} className="text-indigo-300 hover:underline">
                          {s.player.name}
                        </Link>
                      ) : (
                        <span className="text-gray-200">Unknown player</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.event_ids?.length ?? 0}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openTournamentModal(s.player?.id || "", s.event_ids || [], s.player?.name)}
                      className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                      disabled={!s.player?.id || !s.event_ids?.length}
                    >
                      View Tournaments
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

      {description === 'Longest Streak of Consecutive Finals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive ATP tournament finals reached in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><strong>Ivan Lendl</strong></span>, with <strong className="!text-amber-300">18</strong> consecutive finals between October 1981 and May 1982. The run began at <Link href={getTourneyHref({ slug: createSlug('Madrid'), year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 1981</Link>, where Lendl reached and won the final against <span className="inline-flex items-center gap-2"><Flag ioc="PER" className="w-4 h-3" /><strong>Pablo Arraya</strong></span> 6-3, 6-2, 6-2, and continued through <Link href={getTourneyHref({ slug: createSlug('Forest Hills'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Forest Hills 1982</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Eddie Dibbs</strong></span> 6-1, 6-1. The streak was interrupted at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1982</Link>, when <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Mats Wilander</strong></span> defeated Lendl 4-6, 7-5, 3-6, 6-4, 6-2 in the fourth round.
            That run is anchored by <Link href={getTourneyHref({ slug: createSlug('Madrid'), year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 1981</Link>, <Link href={getTourneyHref({ slug: createSlug('Forest Hills'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Forest Hills 1982</Link> and <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1982</Link>.
          </p>
          <p>
            Second are <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span>, both with <strong className="!text-amber-300">17</strong> consecutive finals reached. Federer’s streak ran from Halle 2005 to Toronto/Canada Masters 2006; it began with his title at Halle 2005, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><strong>Marat Safin</strong></span> 6-4, 6-7(6), 6-4, and ended at Cincinnati 2006, when <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><strong>Andy Murray</strong></span> defeated him 7-5, 6-4 in the second round.
            That streak also runs through <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2005</Link>, <Link href={getTourneyHref({ slug: 'canada-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada Masters 2006</Link> and <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 2006</Link>.
          </p>
          <p>
            Djokovic’s streak ran from the 2015 Australian Open to the 2016 Australian Open, covering <strong className="!text-amber-300">17</strong> straight tournament finals. It began with his title in Melbourne, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><strong>Andy Murray</strong></span> 7-6(5), 6-7(4), 6-3, 6-0, and was stopped at Dubai 2016, when he retired against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>Feliciano López</strong></span> after losing the first set 6-3 in the quarter-finals.
            That run also includes <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2015 Australian Open</Link>, <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2016 Australian Open</Link> and <Link href={getTourneyHref({ slug: createSlug('Dubai'), year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai 2016</Link>.
          </p>
          <p>
            Behind them are <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><strong>Guillermo Vilas</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Björn Borg</strong></span>, both with <strong className="!text-amber-300">13</strong> consecutive finals reached. Vilas’ run came in 1977, starting at Kitzbühel and extending through Johannesburg, while Borg’s streak ran from Tokyo Indoors 1979 to Basel 1980.
            Vilas’ and Borg’s paths also run through <Link href={getTourneyHref({ slug: createSlug('Kitzbuhel'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 1977</Link>, <Link href={getTourneyHref({ slug: createSlug('Johannesburg'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Johannesburg 1977</Link>, <Link href={getTourneyHref({ slug: createSlug('Tokyo Indoor'), year: 1979 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo Indoor 1979</Link> and <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 1980 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 1980</Link>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>John McEnroe</strong></span> follows with <strong className="!text-amber-300">11</strong> consecutive finals in 1984. His run began with the <Link href={getTourneyHref({ slug: 'atp-finals', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters Grand Prix 1984</Link> at the start of the year and reached its <strong className="text-white">11th</strong> final at the <Link href={getTourneyHref({ slug: 'canada-masters', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canadian Open 1984</Link>, before being interrupted at <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 1984</Link>, where <span className="inline-flex items-center gap-2"><Flag ioc="IND" className="w-4 h-3" /><strong>Vijay Amritraj</strong></span> beat him 6-7, 6-2, 6-3 in the first round.
          </p>
          <p>
            The hierarchy for consecutive ATP finals reached is therefore led by Lendl at <strong className="!text-amber-300">18</strong>, followed by Federer and Djokovic at <strong className="!text-amber-300">17</strong>, Vilas and Borg at <strong className="!text-amber-300">13</strong>, and McEnroe at <strong className="!text-amber-300">11</strong>. This ranking counts consecutive tournaments entered in which the player reached the singles final.
          </p>
        </RecordNarrative>
      )}

      {description === 'Longest Streak of Consecutive Semifinals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive ATP tournament semifinals reached in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><strong>Ivan Lendl</strong></span>, with <strong className="!text-amber-300">20</strong> straight semifinals. The run opened at <Link href={getTourneyHref({ slug: 'houston-2', year: 1985 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indianapolis 1985</Link> and closed at <Link href={getTourneyHref({ slug: 'new-haven', year: 1986 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stratton Mountain 1986</Link>, which makes the streak easy to trace from one end of the season to the other.
          </p>
          <p>
            The second-longest streak is shared by <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>Rafael Nadal</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span>, both with <strong className="!text-amber-300">19</strong> consecutive semifinals. Nadal's run opened at <Link href={getTourneyHref({ slug: 'santiago-2', year: 2013 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Vina del Mar 2013</Link> and closed at <Link href={getTourneyHref({ slug: 'rio-de-janeiro', year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rio de Janeiro 2014</Link>, while Federer's stretch ran from <Link href={getTourneyHref({ slug: 'hamburg', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hamburg Masters 2005</Link> to <Link href={getTourneyHref({ slug: 'canada-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada Masters 2006</Link>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><strong>Ivan Lendl</strong></span> also appears again with another major streak of <strong className="!text-amber-300">18</strong> straight semifinals, opening at <Link href={getTourneyHref({ slug: 'madrid', year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 1981</Link> and ending at <Link href={getTourneyHref({ slug: 'forest-hills', year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Forest Hills WCT 1982</Link>, underscoring how the early 1980s were one of the most reliable eras of deep tournament runs in men's tennis.
          </p>
          <p>
            Behind them, long semifinal streaks from <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Jimmy Connors</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span> show how rare it is to make the last four in event after event. Connors' streak ran from <Link href={getTourneyHref({ slug: 'rotterdam', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam 1984</Link> to <Link href={getTourneyHref({ slug: 'memphis', year: 1985 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Memphis 1985</Link>, while Djokovic's opened at <Link href={getTourneyHref({ slug: 'australian-open', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2015</Link> and closed at <Link href={getTourneyHref({ slug: 'australian-open', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2016</Link>. The table on this page is driven by the same consecutive-semifinal data, so the narrative here is aligned with the top streaks your chart reports.
          </p>
        </RecordNarrative>
      )}

      {description === 'Longest Streak of Consecutive Grand Slam Semifinals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive Grand Slam semifinals reached in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span>, with <strong className="!text-amber-300">23</strong> straight major semifinals between <Link href={getTourneyHref({ slug: 'wimbledon', year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2004</Link> and the <Link href={getTourneyHref({ slug: 'australian-open', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2010 Australian Open</Link>. His run is the gold standard for durability at the highest level of tennis.             The streak began at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2004</Link>, where Federer reached the semifinals after beating <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><strong>Lleyton Hewitt</strong></span> 6-1, 6-7(1), 6-0, 6-4 in the quarterfinals. It ended at <Link href={getTourneyHref({ slug: 'roland-garros', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2010</Link>, when <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Robin Soderling</strong></span> defeated him 3-6, 6-3, 7-5, 6-4 in the quarterfinals.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span>, with <strong className="!text-amber-300">14</strong> consecutive Grand Slam semifinals from <Link href={getTourneyHref({ slug: 'wimbledon', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2010</Link> through the <Link href={getTourneyHref({ slug: 'australian-open', year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2014 Australian Open</Link>. His run began with a quarterfinal win over <span className="inline-flex items-center gap-2"><Flag ioc="TPE" className="w-4 h-3" /><strong>Yen-Hsun Lu</strong></span> at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2010</Link> and was interrupted when <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Stan Wawrinka</strong></span> beat him 2-6, 6-4, 6-2, 3-6, 9-7 in the <Link href={getTourneyHref({ slug: 'australian-open', year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2014 Australian Open</Link> quarterfinals.
          </p>
          <p>
             <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Jimmy Connors</strong></span> also belongs in this tier, with <strong className="!text-amber-300">11</strong> consecutive Grand Slam semifinals from the <Link href={getTourneyHref({ slug: 'us-open', year: 1976 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1976 US Open</Link> to the <Link href={getTourneyHref({ slug: 'us-open', year: 1980 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1980 US Open</Link>. The streak ended at <Link href={getTourneyHref({ slug: 'roland-garros', year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1981</Link>, where Connors was stopped in the quarterfinals.
          </p>
          <p>
           Before Djokovic, the main reference was <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><strong>Ivan Lendl</strong></span>, who reached <strong className="!text-amber-300">10</strong> consecutive Grand Slam semifinals from <Link href={getTourneyHref({ slug: 'us-open', year: 1985 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1985 US Open</Link> to the <Link href={getTourneyHref({ slug: 'australian-open', year: 1988 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1988 Australian Open</Link>. Lendl’s run ended at <Link href={getTourneyHref({ slug: 'roland-garros', year: 1988 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1988</Link>, when <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Jonas Svensson</strong></span> defeated him 7-6, 7-5, 6-2.
          </p>
          <p>
            The Grand Slam semifinal-streak hierarchy is therefore led by Federer at <strong className="!text-amber-300">23</strong>, followed by Djokovic at <strong className="!text-amber-300">14</strong>, Connors at <strong className="!text-amber-300">11</strong> and Lendl at <strong className="!text-amber-300">10</strong>. This ranking counts consecutive Grand Slam tournaments in which the player reached at least the semifinal stage.
          </p>
        </RecordNarrative>
      )}

      {description === 'Longest Streak of Consecutive Grand Slam Finals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive Grand Slam finals reached in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span>, with <strong className="!text-amber-300">10</strong> straight major finals from <Link href={getTourneyHref({ slug: 'wimbledon', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2005</Link> through the <Link href={getTourneyHref({ slug: 'us-open', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2007 US Open</Link>. That run remains the benchmark for tournament-level consistency at the highest stage of the sport.             Federer’s streak began at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2005</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Andy Roddick</strong></span> 6-2, 7-6, 6-4 in the final, and it ended after the <Link href={getTourneyHref({ slug: 'us-open', year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2007 US Open</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span> 7-6, 7-6, 6-4. The run was interrupted at the <Link href={getTourneyHref({ slug: 'australian-open', year: 2008 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2008 Australian Open</Link>, when Djokovic defeated Federer 7-5, 6-3, 7-6(5) in the semifinals.
            Federer also owns another streak of <strong className="!text-amber-300">8</strong> consecutive Grand Slam finals, from <Link href={getTourneyHref({ slug: 'roland-garros', year: 2008 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2008</Link> to the <Link href={getTourneyHref({ slug: 'australian-open', year: 2010 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2010</Link>, which stands as the second-best run in this ranking.
          </p>
          <p>
            Behind him are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Jimmy Connors</strong></span>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Bjorn Borg</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span>, each with <strong className="!text-amber-300">6</strong> consecutive Grand Slam finals reached. Connors’ streak ran from the <Link href={getTourneyHref({ slug: 'australian-open', year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 Australian Open</Link> final through the <Link href={getTourneyHref({ slug: 'us-open', year: 1975 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1975 US Open</Link> final, while Borg’s run was centred on his late-1970s major final sequence and Djokovic’s came from the <Link href={getTourneyHref({ slug: 'australian-open', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2015 Australian Open</Link> to <Link href={getTourneyHref({ slug: 'roland-garros', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2016</Link>.
          </p>
          <p>
            Behind them, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>Rafael Nadal</strong></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><strong>Jannik Sinner</strong></span> are both listed at <strong className="!text-amber-300">5</strong> consecutive Grand Slam finals, with Nadal’s streak ending at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2012 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2012</Link> and Sinner’s running from the <Link href={getTourneyHref({ slug: 'us-open', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2024</Link> to the <Link href={getTourneyHref({ slug: 'us-open', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2025</Link>. These runs show how rare it is to keep appearing in the biggest match over multiple years.
          </p>
          <p>
            The hierarchy is therefore led by Federer at <strong className="!text-amber-300">10</strong>, followed by his second run of <strong className="!text-amber-300">8</strong>, and then Connors, Borg and Djokovic at <strong className="!text-amber-300">6</strong>, with Nadal and Sinner next at <strong className="!text-amber-300">5</strong>.
          </p>
        </RecordNarrative>
      )}      {description === 'Longest Streak of Consecutive Masters 1000 Finals' && (
        <RecordNarrative>
          <p>
            The Open Era record for the longest streak of consecutive Masters 1000 finals highlights the tour’s most reliable performers, with repeated deep runs across the biggest regular-season events.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span> holds the all-time record with <strong className="!text-amber-300">11</strong> consecutive Masters 1000 finals between <Link href={getTourneyHref({ slug: 'paris-masters', year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2014 Paris Masters</Link> and <Link href={getTourneyHref({ slug: 'miami-masters', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2016 Miami Masters</Link>. During this span, Djokovic dominated across every surface and produced one of the greatest peaks in tennis history.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span> reached <strong className="!text-amber-300">7</strong> consecutive Masters 1000 finals from <Link href={getTourneyHref({ slug: 'hamburg', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Hamburg Masters</Link> to <Link href={getTourneyHref({ slug: 'canada-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2006 Canada Masters</Link>. The streak reflected Federer's consistency and brilliance during his prime years.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>Rafael Nadal</strong></span> also achieved <strong className="!text-amber-300">7</strong> consecutive Masters 1000 finals, starting at <Link href={getTourneyHref({ slug: 'rome-masters', year: 2012 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2012 Rome Masters</Link> and ending at <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2013 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2013 Cincinnati Masters</Link>. The run came during his remarkable comeback from injury and showcased his resilience and versatility.
          </p>
        </RecordNarrative>
      )}

      {description === 'Longest Streak of Consecutive Grand Slam Quarterfinals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive Grand Slam quarterfinals reached belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span>, with <strong className="!text-amber-300">36</strong> straight major quarterfinals. Federer’s run is the Open Era ceiling for making the last eight at tennis’ biggest events.
            The streak ran from <Link href={getTourneyHref({ slug: 'wimbledon', year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2004</Link> to <Link href={getTourneyHref({ slug: 'roland-garros', year: 2013 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2013</Link>. It began when Federer reached the Wimbledon quarterfinals after beating <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><strong>Ivo Karlovic</strong></span> 6-3, 7-6, 7-6 in the fourth round, and it ended at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2013 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2013</Link>, when <span className="inline-flex items-center gap-2"><Flag ioc="UKR" className="w-4 h-3" /><strong>Sergiy Stakhovsky</strong></span> defeated him 6-7(5), 7-6(5), 7-5, 7-6(5) in the second round.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span>, with <strong className="!text-amber-300">28</strong> consecutive Grand Slam quarterfinals reached. His run started at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2009 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2009</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><strong>Dudi Sela</strong></span> 6-2, 6-4, 6-1 in the fourth round, and it was interrupted at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2016</Link> by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Sam Querrey</strong></span> 7-6(6), 6-1, 3-6, 7-6(5) in the third round.
          </p>
          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Jimmy Connors</strong></span>, with <strong className="!text-amber-300">27</strong> straight Grand Slam quarterfinals from <Link href={getTourneyHref({ slug: 'wimbledon', year: 1973 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1973</Link> to <Link href={getTourneyHref({ slug: 'roland-garros', year: 1983 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1983</Link>. His streak began with a win over <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><strong>Bernie Mitton</strong></span> 6-3, 6-3, 6-2 in the 1973 Wimbledon fourth round and ended at <Link href={getTourneyHref({ slug: 'wimbledon', year: 1983 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1983</Link>, when <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><strong>Kevin Curren</strong></span> beat him 6-3, 6-7, 6-3, 7-6.
          </p>
          <p>
            Behind the top three, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><strong>Andy Murray</strong></span> is listed with <strong className="!text-amber-300">18</strong> consecutive Grand Slam quarterfinals, his run ending at <Link href={getTourneyHref({ slug: 'us-open', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">the 2015 US Open</Link> when <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><strong>Kevin Anderson</strong></span> defeated him 7-6(5), 6-3, 6-7(2), 7-6(0) in the fourth round.
          </p>
          <p>
            The ranking continues with <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>Rafael Nadal</strong></span> at <strong className="!text-amber-300">16</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><strong>Ivan Lendl</strong></span> at <strong className="!text-amber-300">14</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Björn Borg</strong></span> at <strong className="!text-amber-300">12</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Pete Sampras</strong></span> at <strong className="!text-amber-300">11</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><strong>David Ferrer</strong></span> at <strong className="!text-amber-300">10</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>John McEnroe</strong></span> at <strong className="!text-amber-300">9</strong>. This record counts consecutive Grand Slam tournaments in which the player reached at least the quarterfinal stage.
          </p>
        </RecordNarrative>
      )}

      {description === 'Longest Streak of Consecutive Quarterfinals' && (
        <RecordNarrative>
          <p>
            The longest streak of consecutive ATP tournament quarterfinals reached in the Open Era belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><strong>Roger Federer</strong></span>, with <strong className="!text-amber-300">29</strong> straight quarterfinals. The streak opened at <Link href={getTourneyHref({ slug: 'us-open', year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2004</Link> and closed at <Link href={getTourneyHref({ slug: 'canada-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada Masters 2006</Link>, a two-year run in which Federer kept reaching the last eight across majors, Masters events, indoor tournaments and grass-court stops.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><strong>Novak Djokovic</strong></span>, with <strong className="!text-amber-300">26</strong> consecutive quarterfinals reached. His run began at <Link href={getTourneyHref({ slug: 'us-open', year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2014</Link> and closed at <Link href={getTourneyHref({ slug: 'miami-masters', year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami Masters 2016</Link>, covering the peak stretch of his 2015 dominance and the early months of 2016.
          </p>
          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><strong>Bjorn Borg</strong></span>, with <strong className="!text-amber-300">24</strong> consecutive quarterfinals from <Link href={getTourneyHref({ slug: 'roland-garros', year: 1979 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1979</Link> to <Link href={getTourneyHref({ slug: 'atp-finals', year: 1980 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters 1980</Link>. Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>John McEnroe</strong></span>, whose <strong className="!text-amber-300">23</strong>-tournament streak ran from <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati Masters 1981</Link> to <Link href={getTourneyHref({ slug: 'philadelphia', year: 1983 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia 1983</Link>.
          </p>
          <p>
            The next group starts at <strong className="!text-amber-300">21</strong>: <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Jimmy Connors</strong></span> from <Link href={getTourneyHref({ slug: 'rotterdam', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam 1984</Link> to <Link href={getTourneyHref({ slug: 'wct-finals', year: 1985 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals 1985</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><strong>Ilie Nastase</strong></span> from <Link href={getTourneyHref({ slug: 'toronto-1', year: 1976 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toronto WCT 1976</Link> to <Link href={getTourneyHref({ slug: 'birmingham-wct-2', year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Birmingham WCT 1977</Link>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><strong>Andre Agassi</strong></span> from <Link href={getTourneyHref({ slug: 'us-open', year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1994</Link> to <Link href={getTourneyHref({ slug: 'us-open', year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1995</Link>.
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
        <div className="py-8 text-center text-gray-300">No consecutive rounds found.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * viewLimit)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Consecutive Rounds by Tournament">
        {renderTable(streaks, 0)}
      </Modal>

      <Modal show={showTournamentModal} onClose={() => setShowTournamentModal(false)} title={tournamentModalPlayer ? `Tournaments for ${tournamentModalPlayer}` : "Tournament Details"}>
        {tournamentLoading ? (
          <div className="py-8 text-center text-gray-300">Loading tournaments…</div>
        ) : tournamentError ? (
          <div className="py-8 text-center text-red-500">{tournamentError}</div>
        ) : tournamentDetails.length === 0 ? (
          <div className="py-8 text-center text-gray-300">No tournaments found.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 text-center">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {tournamentDetails.map((t, idx) => (
                  <tr key={`${t.event_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                    <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{idx + 1}</td>
                    <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{t.tourney_name}</td>
                    <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{t.tourney_date ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  );
}
