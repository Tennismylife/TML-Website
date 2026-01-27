"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Pagination from "@/components/Pagination";
import Filters from "./Filters";
import Flag from '@/components/Flag';
import ResultsSkeleton from '@/components/ResultsSkeleton';
import { getPlayerHref } from '@/lib/utils';

const STAT_LABELS: Record<string, string> = {
  aces: "Aces",
  df: "Double Faults",
  "1stserve": "1st Serve %",
  "1stservewon": "1st Serve Won %",
  "2ndservewon": "2nd Serve Won %",
  servicewon: "Service Points Won %",
  bpsaved: "Break Points Saved %",
  bpwon: "Break Points Won %",
  "1streturnwon": "1st Serve Return Won %",
  "2ndreturnwon": "2nd Serve Return Won %",
  returnwon: "Return Points Won %",
  totalpoints: "Total Points Played",
  totalpointswon: "Total Points Won",
  totalpointswonpct: "Total Points Won %",
  totalgames: "Total Games Played",
  totalgameswon: "Total Games Won",
  gameswonpct: "Games Won %",
  tiebreaksplayed: "Tiebreaks Played",
  tiebreakswon: "Tiebreaks Won",
  tiebreakswonpct: "Tiebreaks Won %",
  setsplayed: "Sets Played",
  setswon: "Sets Won",
  setswonpct: "Sets Won %",
  totalminutes: "Total Minutes",
  avgminutes: "Average Minutes per Match",
};

interface PlayerStat {
  id: string;
  name: string;
  ioc?: string;
  matches: number;
  output: number;
}

interface StatisticsInnerProps {
  initialData?: PlayerStat[];
  initialStat?: string;
  pageTitle?: string;
  relatedStats?: Array<{ key: string; label: string }>;
}

export default function StatisticsInner({ initialData = [], initialStat: propInitialStat, pageTitle, relatedStats = [] }: StatisticsInnerProps) {
  const searchParams = useSearchParams();

  // Initialize stat from props, path segment, or query param
  const derivedInitialStat = (() => {
    if (propInitialStat) return propInitialStat;
    try {
      const sp = searchParams?.get("stat");
      if (sp) return sp;
      const parts = (usePathname() ?? "").split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'statistics') return parts[1];
    } catch (err) {
      // ignore
    }
    return 'aces';
  })();

  const [stat, setStat] = useState(derivedInitialStat);
  const [surface, setSurface] = useState("all");
  const [year, setYear] = useState("all");
  const [tourneyLevel, setTourneyLevel] = useState("all");
  const [minMatches, setMinMatches] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Funzione per generare il titolo dinamico con i filtri
  const getDynamicTitle = () => {
    const baseTitle = pageTitle || STAT_LABELS[stat] || "Statistics";
    const parts = [baseTitle];
    
    if (surface !== "all") {
      const surfaceLabel = surface.charAt(0).toUpperCase() + surface.slice(1);
      parts.push(`on ${surfaceLabel}`);
    }
    if (year !== "all") {
      parts.push(`in ${year}`);
    }
    if (tourneyLevel !== "all") {
      const levelMap: Record<string, string> = {
        G: "Grand Slam",
        M: "Masters",
        A: "ATP Tour",
        C: "Challenger",
        F: "Futures",
        D: "Davis Cup"
      };
      parts.push(`in ${levelMap[tourneyLevel] || tourneyLevel}`);
    }
    
    return parts.join(" ");
  };

  // Aggiorna il document.title dinamicamente
  useEffect(() => {
    // Usa setTimeout per assicurarsi che l'aggiornamento avvenga dopo che Next.js ha settato il title
    const timer = setTimeout(() => {
      // Leggi direttamente dai searchParams per avere sempre i valori più aggiornati
      const qStat = (() => {
        try {
          const sp = searchParams?.get("stat");
          if (sp) return sp;
          const parts = (pathname ?? "").split('/').filter(Boolean);
          if (parts.length >= 2 && parts[0] === 'statistics') return parts[1];
        } catch (err) { /* ignore */ }
        return stat;
      })();
      
      const qSurface = searchParams?.get("surface") || surface;
      const qYear = searchParams?.get("year") || year;
      const qTourneyLevel = searchParams?.get("tourneyLevel") || tourneyLevel;
      
      const baseTitle = pageTitle || STAT_LABELS[qStat] || "Statistics";
      const parts = [baseTitle];
      
      if (qSurface && qSurface !== "all") {
        const surfaceLabel = qSurface.charAt(0).toUpperCase() + qSurface.slice(1);
        parts.push(`on ${surfaceLabel}`);
      }
      if (qYear && qYear !== "all") {
        parts.push(`in ${qYear}`);
      }
      if (qTourneyLevel && qTourneyLevel !== "all") {
        const levelMap: Record<string, string> = {
          G: "Grand Slam",
          M: "Masters",
          A: "ATP Tour",
          C: "Challenger",
          F: "Futures",
          D: "Davis Cup"
        };
        parts.push(`in ${levelMap[qTourneyLevel] || qTourneyLevel}`);
      }
      
      const dynamicTitle = parts.join(" ");
      document.title = `${dynamicTitle} | Tennis Statistics`;
    }, 0);

    return () => clearTimeout(timer);
  }, [stat, surface, year, tourneyLevel, pageTitle, searchParams, pathname]);

  const perPage = 30;

  // Accessibility refs & focus management for results
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const prevLoadingRef = useRef<boolean>(isLoading);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // focus the results heading when loading completes
      try { resultsHeadingRef.current?.focus(); } catch (e) { /* ignore */ }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // Sync state from URL when search params or pathname change
  useEffect(() => {
    const qStat = searchParams?.get("stat");
    const qSurface = searchParams?.get("surface") ?? "all";
    const qYear = searchParams?.get("year") ?? "all";
    const qTourneyLevel = searchParams?.get("tourneyLevel") ?? "all";
    const qMinMatches = Number(searchParams?.get("minMatches") ?? "1") || 1;

    // If pathname has /statistics/<stat>, prefer it over query param
    let pathStat: string | null = null;
    try {
      const parts = (pathname ?? "").split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'statistics') pathStat = parts[1];
    } catch (err) { /* ignore */ }

    const finalStat = pathStat ?? qStat ?? 'aces';

    if (finalStat !== stat) setStat(finalStat);
    if (qSurface !== surface) setSurface(qSurface);
    if (qYear !== year) setYear(qYear);
    if (qTourneyLevel !== tourneyLevel) setTourneyLevel(qTourneyLevel);
    if (qMinMatches !== minMatches) setMinMatches(qMinMatches);
  }, [searchParams, pathname]);

  // Update URL with given keys (removes params with value 'all' or empty)
  // If 'stat' is provided, use it as a path segment (/statistics/<stat>) instead of ?stat=
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    setIsLoading(true);
    updateUrl(updates);
  };

  // Update URL without triggering loading state (for client-side only filters like minMatches)
  const updateUrlSimple = (updates: Record<string, string | number | null>) => {
    updateUrl(updates);
  };

  const updateUrl = (updates: Record<string, string | number | null>) => {
    // Start from current search params
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    // If stat is being updated, we'll remove any 'stat' query param and build the new pathname
    let nextStat: string | null = null;
    if (updates.hasOwnProperty('stat')) {
      const v = updates['stat'];
      if (v === null || v === '' || v === 'all') nextStat = null;
      else nextStat = String(v);
    } else {
      // If not updating stat, read it from current pathname if present
      const parts = (pathname ?? "").split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'statistics') nextStat = parts[1];
    }

    // Apply other updates to params
    Object.entries(updates).forEach(([k, v]) => {
      if (k === 'stat') return; // handled in path
      if (v === null || v === '' || v === 'all') params.delete(k);
      else params.set(k, String(v));
    });

    const qs = params.toString();
    const basePath = nextStat ? `/statistics/${nextStat}` : `/statistics`;
    router.push(`${basePath}${qs ? `?${qs}` : ''}`);
  };

  // Fetch stats from API using AbortController and setIsLoading for skeleton
  const loadData = async () => {
    // cancel previous
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      // Decide top based on stat type: percentage stats need a larger sample
      const percentStats = [
        "1stserve","1stservewon","2ndservewon","servicewon","bpsaved",
        "1streturnwon","2ndreturnwon","returnwon","bpwon",
        "totalpointswonpct","gameswonpct","tiebreakswonpct","setswonpct"
      ];
      const topValue = percentStats.includes(stat) ? '200' : '100';

      const params = new URLSearchParams({
        surface,
        year,
        tourneyLevel,
        stat,
        top: topValue
      });

      const res = await fetch(`/api/statistics/${stat}?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlayerStats(data || []);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      setPlayerStats([]);
    } finally {
      setIsLoading(false);
      setPage(1);
    }
  };

  useEffect(() => {
    loadData();
    return () => { abortRef.current?.abort(); };
  }, [stat, surface, year, tourneyLevel]);

  // Filter players by minimum matches
  const filteredPlayers = playerStats.filter((p) => p.matches >= minMatches);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const playersToShow = filteredPlayers.slice(start, end);

  // Format stat values
  const formatStat = (statKey: string, value: number) => {
    const percentStats = [
      "1stserve","1stservewon","2ndservewon","servicewon","bpsaved",
      "1streturnwon","2ndreturnwon","returnwon","bpwon",
      "totalpointswonpct","gameswonpct","tiebreakswonpct","setswonpct"
    ];
    if (percentStats.includes(statKey)) return `${value.toFixed(1)}%`;
    if (statKey === "avgminutes") return value.toFixed(1);
    return value;
  };

  // Generate table - Mobile Optimized
  const renderTable = (list: PlayerStat[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-4">
      <table role="table" className="min-w-full border-collapse text-base w-full">
        <caption className="sr-only">Player statistics</caption>
        <thead>
          <tr className="bg-black">
            <th scope="col" className="border border-white/30 px-2 sm:px-4 py-3 text-center text-base sm:text-xl text-gray-200 font-semibold">#</th>
            <th scope="col" className="border border-white/30 px-2 sm:px-4 py-3 text-left text-base sm:text-xl text-gray-200 font-semibold">Player</th>
            <th scope="col" className="border border-white/30 px-2 sm:px-4 py-3 text-center text-base sm:text-xl text-gray-200 font-semibold">Matches</th>
            <th scope="col" className="border border-white/30 px-2 sm:px-4 py-3 text-center text-base sm:text-xl text-gray-200 font-semibold">{STAT_LABELS[stat]}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10 transition-colors">
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-medium text-base">
                  {globalRank}
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-gray-200">
                  <div className="flex items-center gap-2">
                    {p.ioc ? <Flag ioc={p.ioc} className="w-4 h-3" /> : <span className="text-base sm:text-lg">🏳️</span>}
                    <Link
                      href={getPlayerHref((p as any).slug ?? String(p.id))}
                      className="text-indigo-300 hover:text-indigo-200 hover:underline text-base sm:text-lg transition-colors"
                    >
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-medium text-base">
                  {p.matches}
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-semibold text-blue-300 text-base">
                  {formatStat(stat, p.output)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Modal component - Mobile Optimized
  const Modal = ({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2" onClick={onClose}>
        <div className="bg-gray-900 text-gray-200 p-3 sm:p-4 w-full max-w-7xl max-h-[90vh] sm:max-h-screen overflow-y-auto rounded-lg border border-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-white">All Players - {STAT_LABELS[stat]}</h2>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 font-medium text-sm min-h-[44px] transition-colors"
            >
              ✕ Close
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 p-2 sm:p-4 text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center">{getDynamicTitle()}</h1>
          </div>

          {/* Filters heading + fieldset */}
          <h2 id="filters-heading" className="sr-only">Filters</h2>
          <fieldset className="contents">
            <legend className="sr-only">Filter options</legend>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Stat Selector */}
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                  <label htmlFor="statSelect" className="font-bold text-yellow-400 text-lg sm:text-xl tracking-wide drop-shadow-lg">Stat:</label>
                  <select id="statSelect" value={stat} onChange={(e) => { const v = e.target.value; setStat(v); updateUrlParams({ stat: v }); }} className="w-full sm:w-auto bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]">
                    {Object.entries(STAT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <Filters surface={surface} onSurfaceChange={(v) => { setSurface(v); updateUrlParams({ surface: v }); }} year={year} onYearChange={(v) => { setYear(v); updateUrlParams({ year: v }); }} tourneyLevel={tourneyLevel} onTourneyLevelChange={(v) => { setTourneyLevel(v); updateUrlParams({ tourneyLevel: v }); }} />

            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <label htmlFor="minMatchesRange" className="block text-sm font-medium mb-2 text-white">Minimum Matches: <span className="text-blue-400 font-bold">{minMatches}</span></label>
                  <input id="minMatchesRange" type="range" min="1" max="100" value={minMatches} onChange={(e) => { const m = Number(e.target.value); setMinMatches(m); updateUrlSimple({ minMatches: m }); }} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>50</span><span>100</span></div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setMinMatches(1); updateUrlSimple({ minMatches: 1 }); }} aria-pressed={minMatches === 1} className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]">Min</button>
                  <button onClick={() => { setMinMatches(10); updateUrlSimple({ minMatches: 10 }); }} aria-pressed={minMatches === 10} className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]">10+</button>
                  <button onClick={() => { setMinMatches(25); updateUrlSimple({ minMatches: 25 }); }} aria-pressed={minMatches === 25} className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]">25+</button>
                  <button onClick={() => { setMinMatches(50); updateUrlSimple({ minMatches: 50 }); }} aria-pressed={minMatches === 50} className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]">50+</button>
                </div>
              </div>
            </div>

          </fieldset>

          <h2 id="results-heading" className="sr-only" tabIndex={-1} ref={resultsHeadingRef}>Results</h2>
          <section aria-labelledby="results-heading" role="region" aria-live="polite" aria-busy={isLoading ? "true" : "false"} className="contents">
            {isLoading ? (
              <ResultsSkeleton />
            ) : filteredPlayers.length === 0 ? (
              <p role="status" className="text-center py-8 text-gray-300">No data available.</p>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium text-sm transition-colors shadow-md">View All</button>
                </div>

                {renderTable(playersToShow, start)}
                {totalPages > 1 && (<div className="mt-4 flex justify-center"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>)}
              </>
            )}
          </section>

        </div>

        {/* Modal con tutti i giocatori */}
        <Modal show={showModal} onClose={() => setShowModal(false)}>
          <h2 className="text-xl font-bold mb-4">All Players</h2>
          {renderTable(filteredPlayers)}
        </Modal>

        {/* Related Statistics */}
        {relatedStats.length > 0 && (
          <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">Related Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {relatedStats.map(({ key, label }) => (
                <Link
                  key={key}
                  href={`/statistics/${key}`}
                  className="px-4 py-3 bg-gray-700 hover:bg-blue-600 text-white rounded-lg text-center text-sm font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


