"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Pagination from "@/components/Pagination";
import Filters from "./Filters";
import Flag from '@/components/Flag';

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

export default function StatisticsInner() {
  const searchParams = useSearchParams();

  const [stat, setStat] = useState(searchParams?.get("stat") ?? "aces");
  const [surface, setSurface] = useState("all");
  const [year, setYear] = useState("all");
  const [tourneyLevel, setTourneyLevel] = useState("all");
  const [minMatches, setMinMatches] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const perPage = 30;

  const router = useRouter();
  const pathname = usePathname();

  // Sync state from URL when search params change
  useEffect(() => {
    const qStat = searchParams?.get("stat") ?? "aces";
    const qSurface = searchParams?.get("surface") ?? "all";
    const qYear = searchParams?.get("year") ?? "all";
    const qTourneyLevel = searchParams?.get("tourneyLevel") ?? "all";
    const qMinMatches = Number(searchParams?.get("minMatches") ?? "1") || 1;

    if (qStat !== stat) setStat(qStat);
    if (qSurface !== surface) setSurface(qSurface);
    if (qYear !== year) setYear(qYear);
    if (qTourneyLevel !== tourneyLevel) setTourneyLevel(qTourneyLevel);
    if (qMinMatches !== minMatches) setMinMatches(qMinMatches);
  }, [searchParams]);

  // Update URL with given keys (removes params with value 'all' or empty)
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          surface,
          year,
          tourneyLevel,
          stat,
        });
        const res = await fetch(`/api/statistics/${stat}?${params.toString()}`);
        const data = await res.json();
        setPlayerStats(data || []);
      } catch (err) {
        console.error(err);
        setPlayerStats([]);
      } finally {
        setLoading(false);
        setPage(1);
      }
    };
    fetchStats();
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
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-2 sm:px-4 py-3 text-center text-sm sm:text-lg text-gray-200 font-semibold">#</th>
            <th className="border border-white/30 px-2 sm:px-4 py-3 text-left text-sm sm:text-lg text-gray-200 font-semibold">Player</th>
            <th className="border border-white/30 px-2 sm:px-4 py-3 text-center text-sm sm:text-lg text-gray-200 font-semibold">Matches</th>
            <th className="border border-white/30 px-2 sm:px-4 py-3 text-center text-sm sm:text-lg text-gray-200 font-semibold">{STAT_LABELS[stat]}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10 transition-colors">
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-medium">
                  {globalRank}
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-gray-200">
                  <div className="flex items-center gap-2">
                    {p.ioc ? <Flag ioc={p.ioc} className="w-4 h-3" /> : <span className="text-base sm:text-lg">🏳️</span>}
                    <Link
                      href={`/players/${p.id}`}
                      className="text-indigo-300 hover:text-indigo-200 hover:underline text-sm sm:text-base transition-colors"
                    >
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-medium">
                  {p.matches}
                </td>
                <td className="border border-white/10 px-2 sm:px-4 py-3 text-center text-gray-200 font-semibold text-blue-300">
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
        {/* Header con StatsSelector e View All - Mobile Optimized */}
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Advanced Player Statistics</h1>
            <p className="text-gray-300 text-sm text-center sm:text-left mt-2">
              Comprehensive performance analytics and statistics for professional tennis players.
            </p>
          </div>

          {/* Mobile-First Controls */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Stat Selector - Full Width on Mobile */}
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <label className="font-bold text-yellow-400 text-lg sm:text-xl tracking-wide drop-shadow-lg">
                  Stat:
                </label>
                <select
                  value={stat}
                  onChange={(e) => { const v = e.target.value; setStat(v); updateUrlParams({ stat: v }); }}
                  className="w-full sm:w-auto bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  {Object.entries(STAT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

      {/* Filters */}
      <Filters
        surface={surface}
        onSurfaceChange={(v) => { setSurface(v); updateUrlParams({ surface: v }); }}
        year={year}
        onYearChange={(v) => { setYear(v); updateUrlParams({ year: v }); }}
        tourneyLevel={tourneyLevel}
        onTourneyLevelChange={(v) => { setTourneyLevel(v); updateUrlParams({ tourneyLevel: v }); }}
      />

      {/* Min Matches Slider - Mobile Optimized */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-white">
              Minimum Matches: <span className="text-blue-400 font-bold">{minMatches}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={minMatches}
              onChange={(e) => { const m = Number(e.target.value); setMinMatches(m); updateUrlParams({ minMatches: m }); }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setMinMatches(1); updateUrlParams({ minMatches: 1 }); }}
              className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]"
            >
              Min
            </button>
            <button
              onClick={() => { setMinMatches(10); updateUrlParams({ minMatches: 10 }); }}
              className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]"
            >
              10+
            </button>
            <button
              onClick={() => { setMinMatches(25); updateUrlParams({ minMatches: 25 }); }}
              className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]"
            >
              25+
            </button>
            <button
              onClick={() => { setMinMatches(50); updateUrlParams({ minMatches: 50 }); }}
              className="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors min-h-[36px]"
            >
              50+
            </button>
          </div>
        </div>
      </div>

      {/* Table / Loading */}
      {loading ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      ) : (
        <>
          {/* View All Button - Above Table */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium text-sm transition-colors shadow-md"
            >
              View All
            </button>
          </div>

          {renderTable(playersToShow, start)}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      </div>

      {/* Modal con tutti i giocatori */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-bold mb-4">All Players</h2>
        {renderTable(filteredPlayers)}
      </Modal>
    </main>
  );
}
