"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Pagination from "@/components/Pagination";
import Filters from "./Filters";
import { getFlagFromIOC } from "@/lib/utils";

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

  const [stat, setStat] = useState(searchParams.get("stat") || "aces");
  const [surface, setSurface] = useState("all");
  const [year, setYear] = useState("all");
  const [tourneyLevel, setTourneyLevel] = useState("all");
  const [minMatches, setMinMatches] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const perPage = 30;

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

  // Generate table
  const renderTable = (list: PlayerStat[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-4">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">{STAT_LABELS[stat]}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={`/players/${p.id}`} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.matches}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{formatStat(stat, p.output)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Modal component
  const Modal = ({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800" onClick={(e) => e.stopPropagation()}>
          {children}
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500">Close</button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white">
      {/* Header con StatsSelector e View All */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tennis Stats at a Glance</h1>
          <p className="text-gray-300 text-sm">
            This tool calculates detailed performance statistics for tennis players based on match results.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="mr-2 font-medium text-white">Stat:</label>
            <select
              value={stat}
              onChange={(e) => setStat(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(STAT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      </div>

      {/* Filters */}
      <Filters
        surface={surface}
        onSurfaceChange={setSurface}
        year={year}
        onYearChange={setYear}
        tourneyLevel={tourneyLevel}
        onTourneyLevelChange={setTourneyLevel}
      />

      {/* Min Matches Slider */}
      <div className="mb-4 mt-4">
        <label className="block text-sm font-medium mb-1 text-white">
          Minimum Matches: {minMatches}
        </label>
        <input type="range" min="0" max="100" value={minMatches} onChange={(e) => setMinMatches(Number(e.target.value))} className="w-full" />
      </div>

      {/* Table / Loading */}
      {loading ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      ) : (
        <>
          {renderTable(playersToShow, start)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      {/* Modal con tutti i giocatori */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-bold mb-4">All Players</h2>
        {renderTable(filteredPlayers)}
      </Modal>
    </main>
  );
}
