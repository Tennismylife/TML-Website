"use client";

import { useState, useMemo, useEffect } from "react";
import H2HPageFilters from "./H2HPageFilters";
import H2HBars from "./H2HBars";
import H2HWinsChart from "./H2HWinsChart";
import H2HMatchFormatBars from "./H2HMatchFormatBars";
import H2HComebackBars from "./H2HComebackBars";
import H2HMatches from "./H2HMatches";
import H2HHeaderServer from "./H2HHeaderServer";
import H2HTimelineChart from "./H2HTimelineChart";
import H2HServiceSpider from "./H2HServiceSpider";
import H2HReturnSpider from "./H2HReturnSpider";
import H2HAdvancedMetrics from "./H2HAdvancedMetrics";
import H2HCareerBarsClient from "./H2HCareerBarsClient";
import PlayerSearch from "./PlayerSearch";
import { useRouter } from "next/navigation";
import { createH2HUrl } from "@/lib/utils";
import { Match, SortKey, SortDirection } from "@/types";

interface Player {
  id: string;
  atpname: string | null;
  ioc?: string | null;
  slug?: string | null;
  birthdate?: Date | string | null;
  hand?: string | null;
  backhand?: string | null;
}

interface H2HContentClientProps {
  matches: Match[];
  player1: Player;
  player2: Player;
  children?: React.ReactNode;
  careerOverview?: React.ReactNode;
  rank1?: number | null;
  rank2?: number | null;
  points1?: number | null;
  points2?: number | null;
}

export default function H2HContentClient({ matches, player1, player2, children, careerOverview, rank1, rank2, points1, points2 }: H2HContentClientProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [activeSubview, setActiveSubview] = useState<'preview' | 'statistics' | 'careers'>('preview');
  const [statsUnlocked, setStatsUnlocked] = useState(false);
  const [careerMode, setCareerMode] = useState(false);
  const [careerMatches, setCareerMatches] = useState<Match[] | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [statsFilters, setStatsFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
    best_of: 'All' as string | 'All',
  });
  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
    best_of: 'All' as string | 'All',
  });

  // If the user lands on a slug URL that includes query params (SSR path), read them once on mount
  // and initialize the client-side filters so the UI reflects the shared URL state.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qYear = params.get('year');
      const qLevel = params.get('level');
      const qSurface = params.get('surface');
      const qRound = params.get('round');
      const qTourney = params.get('tourney') ?? params.get('tourney_name');
      const qBestOf = params.get('best_of') ?? params.get('bestOf');

      setFilters((prev) => ({
        year: qYear ? (isNaN(Number(qYear)) ? 'All' : Number(qYear)) : prev.year,
        level: qLevel ?? prev.level,
        surface: qSurface ?? prev.surface,
        round: qRound ?? prev.round,
        tourney_name: qTourney ?? prev.tourney_name,
        best_of: qBestOf ?? (prev as any).best_of ?? 'All',
      }));
    } catch (err) {
      // best-effort only
    }
  }, []);

  // Fetch career matches when careerMode is toggled on
  useEffect(() => {
    if (!careerMode || careerMatches !== null) return;
    const id1 = player1.id;
    const id2 = player2.id;
    if (!id1 || !id2) return;
    let cancelled = false;
    setCareerLoading(true);
    Promise.all([
      fetch(`/api/players/performance?id=${id1}`).then((r) => r.json()),
      fetch(`/api/players/performance?id=${id2}`).then((r) => r.json()),
    ])
      .then(([data1, data2]) => {
        if (cancelled) return;
        const arr1: Match[] = Array.isArray(data1) ? data1 : [];
        const arr2: Match[] = Array.isArray(data2) ? data2 : [];
        // Merge: deduplicate by winner_id+loser_id+tourney_date+round key
        const seen = new Set<string>();
        const merged: Match[] = [];
        for (const m of [...arr1, ...arr2]) {
          const key = `${(m as any).winner_id}-${(m as any).loser_id}-${(m as any).tourney_date ?? ''}-${(m as any).round ?? ''}`;
          if (!seen.has(key)) { seen.add(key); merged.push(m); }
        }
        setCareerMatches(merged);
      })
      .catch(() => { if (!cancelled) setCareerMatches([]); })
      .finally(() => { if (!cancelled) setCareerLoading(false); });
    return () => { cancelled = true; };
  }, [careerMode, careerMatches, player1.id, player2.id]);

  // Filtra i match in base ai filtri selezionati
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filters.year !== "All" && m.year !== filters.year) return false;
      if (filters.level !== "All" && m.tourney_level !== filters.level) return false;
      if (filters.surface !== "All" && m.surface !== filters.surface) return false;
      if (filters.round !== "All" && m.round !== filters.round) return false;
      if (filters.tourney_name !== "All" && m.tourney_name !== filters.tourney_name) return false;

      // Apply best_of filter (client-side)
      if (filters.best_of !== "All") {
        const bof = Number(filters.best_of);
        if (!Number.isNaN(bof)) {
          if (m.best_of !== bof) return false;
        } else {
          if (filters.best_of === 'Unknown' || filters.best_of === 'null') {
            if (m.best_of != null) return false;
          }
        }
      }

      return true;
    });
  }, [matches, filters]);

  // Escludi match che non dovrebbero contare (status === false o score speciale)
  const countedFilteredMatches = useMemo(() => {
    if (!filteredMatches) return [];
    return filteredMatches.filter((m: any) => {
      if (m.status === false) return false;
      const sc = (m.score ?? '').toUpperCase();
      if (!sc) return true;
      if (sc.includes('DEF') || sc.includes('W/O') || sc.includes('WEA')) return false;
      return true;
    });
  }, [filteredMatches]);

  // Base match pool for Statistics tab (H2H or career) — computed only after tab is first opened
  const statsBaseMatches = useMemo(
    () => statsUnlocked ? (careerMode ? (careerMatches ?? []) : matches) : [],
    [statsUnlocked, careerMode, careerMatches, matches]
  );

  // Filtered match pool for Statistics tab
  const statsFilteredMatches = useMemo(() => {
    if (!statsUnlocked) return [];
    return statsBaseMatches.filter((m) => {
      if (statsFilters.year !== "All" && m.year !== statsFilters.year) return false;
      if (statsFilters.level !== "All" && m.tourney_level !== statsFilters.level) return false;
      if (statsFilters.surface !== "All" && m.surface !== statsFilters.surface) return false;
      if (statsFilters.round !== "All" && m.round !== statsFilters.round) return false;
      if (statsFilters.tourney_name !== "All" && m.tourney_name !== statsFilters.tourney_name) return false;
      if (statsFilters.best_of !== "All") {
        const bof = Number(statsFilters.best_of);
        if (!Number.isNaN(bof)) {
          if (m.best_of !== bof) return false;
        } else if (statsFilters.best_of === 'Unknown' || statsFilters.best_of === 'null') {
          if (m.best_of != null) return false;
        }
      }
      return true;
    });
  }, [statsBaseMatches, statsFilters]);

  // Calcola statistiche dai match filtrati (usando quelli conteggiati)
  const stats = useMemo(() => {
    let wins1 = 0;
    let wins2 = 0;
    countedFilteredMatches.forEach((m: any) => {
      if (m.winner_name === player1.atpname) wins1++;
      if (m.winner_name === player2.atpname) wins2++;
    });
    const totalMatches = wins1 + wins2;
    const perc1 = totalMatches > 0 ? (wins1 / totalMatches) * 100 : 0;
    const perc2 = totalMatches > 0 ? (wins2 / totalMatches) * 100 : 0;
    return { wins1, wins2, perc1, perc2 };
  }, [countedFilteredMatches, player1.atpname, player2.atpname]);

  return (
    <div className="space-y-8">
      {/* Barre di ricerca per selezionare i giocatori */}
      <div className="flex flex-col md:flex-row gap-4">
        <PlayerSearch 
          label="Player 1" 
          onSelect={(p) => {
            if (player2.atpname) {
              const url = createH2HUrl(p.atpname ?? '', player2.atpname);
              router.push(url);
            }
          }}
          initialPlayer={player1}
        />
        <PlayerSearch 
          label="Player 2" 
          onSelect={(p) => {
            if (player1.atpname) {
              const url = createH2HUrl(player1.atpname, p.atpname ?? '');
              router.push(url);
            }
          }}
          initialPlayer={player2}
        />
      </div>

      {/* Header con statistiche */}
      <H2HHeaderServer
        wins1={stats.wins1}
        wins2={stats.wins2}
        perc1={stats.perc1}
        perc2={stats.perc2}
        player1={player1}
        player2={player2}
        matches={countedFilteredMatches}
        rank1={rank1}
        rank2={rank2}
        points1={points1}
        points2={points2}
      />

      {/* subtab switcher */}
      <div className="flex justify-start gap-4 mb-4">
        <button
          onClick={() => setActiveSubview('preview')}
          className={
            activeSubview === 'preview'
              ? 'font-semibold bg-blue-400 text-white px-3 py-1 rounded'
              : 'text-gray-400 hover:text-blue-400'
          }
        >
          Overview
        </button>
        <button
          onClick={() => { setActiveSubview('statistics'); setStatsUnlocked(true); setCareerMode(true); }}
          className={
            activeSubview === 'statistics'
              ? 'font-semibold bg-blue-400 text-white px-3 py-1 rounded'
              : 'text-gray-400 hover:text-blue-400'
          }
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveSubview('careers')}
          className={
            activeSubview === 'careers'
              ? 'font-semibold bg-blue-400 text-white px-3 py-1 rounded'
              : 'text-gray-400 hover:text-blue-400'
          }
        >
          Careers
        </button>
      </div>

      {/* H2H Preview (narrative) — rendered between score header and filters */}
      {activeSubview === 'careers' ? (
        <div className="mt-4 space-y-8">
          <H2HCareerBarsClient player1={player1} player2={player2} />
        </div>
      ) : activeSubview === 'preview' ? (
        <div className="space-y-8">
          {children}
        </div>
      ) : (
        <div className="mt-4 space-y-8">
          {/* Stats scope toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setCareerMode(true); setStatsFilters({ year: "All", level: "All", surface: "All", round: "All", tourney_name: "All", best_of: 'All' }); }}
              className={careerMode
                ? 'bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-full text-sm'
                : 'text-gray-400 hover:text-blue-400 px-4 py-1.5 rounded-full text-sm border border-gray-700'}
            >
              Full career
            </button>
            <button
              onClick={() => { setCareerMode(false); setStatsFilters({ year: "All", level: "All", surface: "All", round: "All", tourney_name: "All", best_of: 'All' }); }}
              className={!careerMode
                ? 'bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-full text-sm'
                : 'text-gray-400 hover:text-blue-400 px-4 py-1.5 rounded-full text-sm border border-gray-700'}
            >
              H2H matches
            </button>
          </div>

          {/* Filters */}
          {!careerLoading && statsBaseMatches.length > 0 && (
            <H2HPageFilters
              allMatches={statsBaseMatches}
              loading={false}
              error={null}
              hideTourney
              filters={statsFilters}
              setFilters={(newFilters) => setStatsFilters((prev) => ({ ...prev, ...newFilters } as typeof statsFilters))}
            />
          )}

          {careerLoading ? (
            <p className="text-center text-gray-400 text-sm py-12">Loading career data…</p>
          ) : (
            <div className="space-y-12">
              <H2HServiceSpider matches={statsFilteredMatches} player1={player1} player2={player2} />
              <H2HReturnSpider  matches={statsFilteredMatches} player1={player1} player2={player2} />
              <H2HAdvancedMetrics matches={statsFilteredMatches} player1={player1} player2={player2} />
            </div>
          )}
        </div>
      )}

      {/* Filtri e match history: nascosti se H2H è 0-0 assoluto */}
      {activeSubview === 'preview' && matches.length > 0 && <H2HPageFilters
        allMatches={matches}
        loading={false}
        error={null}
        filters={filters}
        setFilters={(newFilters) => {
          const next = { ...filters, ...newFilters } as typeof filters;
          setFilters(next);

          // sync to URL (make filter values linkable/shareable)
          try {
            const params = new URLSearchParams(window.location.search);

            // Prefer reading visible control values from the DOM (more robust in tests)
            const container = document.querySelector('[data-testid="h2h-filters"]');
            const domYear = container?.querySelector('select[name="year"]') as HTMLSelectElement | null;
            const domLevel = container?.querySelector('select[name="level"]') as HTMLSelectElement | null;
            const domSurface = container?.querySelector('select[name="surface"]') as HTMLSelectElement | null;
            const domRound = container?.querySelector('select[name="round"]') as HTMLSelectElement | null;
            const domTourney = container?.querySelector('select[name="tourney"]') as HTMLSelectElement | null;
            const domBestOf = container?.querySelector('select[name="best_of"]') as HTMLSelectElement | null;

            const resolvedYear = domYear ? domYear.value : ((newFilters as any).year ?? next.year);
            const resolvedLevel = domLevel ? domLevel.value : ((newFilters as any).level ?? next.level);
            const resolvedSurface = domSurface ? domSurface.value : ((newFilters as any).surface ?? next.surface);
            const resolvedRound = domRound ? domRound.value : ((newFilters as any).round ?? next.round);
            const resolvedTourney = domTourney ? domTourney.value : ((newFilters as any).tourney_name ?? next.tourney_name);
            const resolvedBestOf = domBestOf ? domBestOf.value : ((newFilters as any).best_of ?? (next as any).best_of);

            if (resolvedYear === 'All') params.delete('year'); else params.set('year', String(resolvedYear));
            if (resolvedLevel === 'All') params.delete('level'); else params.set('level', String(resolvedLevel));
            if (resolvedSurface === 'All') params.delete('surface'); else params.set('surface', String(resolvedSurface));
            if (resolvedRound === 'All') params.delete('round'); else params.set('round', String(resolvedRound));
            if (resolvedTourney === 'All') params.delete('tourney'); else params.set('tourney', String(resolvedTourney));
            if (resolvedBestOf === 'All') params.delete('best_of'); else params.set('best_of', String(resolvedBestOf));

            const qs = params.toString();
            const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
            try {
              const { replace } = require('next/navigation').useRouter();
              replace(url);
            } catch (err) {
              /* ignore */
            }
            try {
              window.history.replaceState({}, '', url);
            } catch (err) {
              /* ignore */
            }
          } catch (err) {
            console.debug('[H2HContentClient] failed to sync filters to URL', err);
          }
        }}
      />}

      {/* Match History */}
      {activeSubview === 'preview' && matches.length > 0 && <div>
        <H2HMatches
          matches={countedFilteredMatches}
          sortKey={sortKey}
          sortDir={sortDir}
          setSortKey={setSortKey}
          setSortDir={setSortDir}
          playerId={player1.id}
        />
      </div>}

      {/* Wins / Sets / Games - stacked */}
      {activeSubview === 'preview' && countedFilteredMatches.length > 0 && <div className="flex flex-col gap-10">
        {/* Wins - full width */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-center">Wins</h2>
          <H2HWinsChart
            matches={countedFilteredMatches}
            player1={player1}
            player2={player2}
          />
        </div>

        {/* Sets Format + Comebacks - 2 colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4 text-center">Sets Format</h2>
            <H2HMatchFormatBars
              matches={countedFilteredMatches}
              player1={player1}
              player2={player2}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-center">Deciding</h2>
            <H2HComebackBars
              matches={countedFilteredMatches}
              player1={player1}
              player2={player2}
            />
          </div>
        </div>

        {/* Sets + Games - 2 colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4 text-center">Sets</h2>
            <H2HBars
              matches={countedFilteredMatches}
              player1={player1}
              player2={player2}
              category="sets"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-center">Games</h2>
            <H2HBars
              matches={countedFilteredMatches}
              player1={player1}
              player2={player2}
              category="games"
            />
          </div>
        </div>
      </div>}

      {/* H2H Series Progression - only when >= 10 matches */}
      {activeSubview === 'preview' && countedFilteredMatches.length >= 10 && (
        <H2HTimelineChart
          matches={countedFilteredMatches}
          player1={player1}
          player2={player2}
        />
      )}

      {/* Careers Overview - at the bottom of the Overview tab */}
      {activeSubview === 'preview' && careerOverview && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-200">Overview</h2>
          {careerOverview}
        </div>
      )}
    </div>
  );
}
