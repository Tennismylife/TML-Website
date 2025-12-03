"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Filters from "./Filters";
import { iocToIso2, flagEmoji } from "../../utils/flags";

// 🔥 NUOVA VERSIONE con API dedicate
async function calculatePlayerStats(stat, surface, year, tourneyLevel) {
  const params = new URLSearchParams({ surface, year, tourneyLevel });

  // Mappa stat → API dedicata
  const statEndpoints = {
    aces: "/api/statistics/aces",
    df: "/api/statistics/df",
    "1stserve": "/api/statistics/1stserve",
    "1stservewon": "/api/statistics/1stservewon",
    "2ndservewon": "/api/statistics/2ndservewon",
    servicewon: "/api/statistics/servicewon",
    bpsaved: "/api/statistics/bpsaved",
    bpwon: "/api/statistics/bpwon",
    "1streturnwon": "/api/statistics/1streturnwon",
    "2ndreturnwon": "/api/statistics/2ndreturnwon",
    returnwon: "/api/statistics/returnwon",
    totalpoints: "/api/statistics/totalpoints",
    totalpointswon: "/api/statistics/totalpointswon",
    totalpointswonpct: "/api/statistics/totalpointswonpct",
    totalgames: "/api/statistics/totalgames",
    totalgameswon: "/api/statistics/totalgameswon",
    gameswonpct: "/api/statistics/gameswonpct",
    tiebreaksplayed: "/api/statistics/tiebreaksplayed",
    tiebreakswon: "/api/statistics/tiebreakswon",
    tiebreakswonpct: "/api/statistics/tiebreakswonpct",
    setsplayed: "/api/statistics/setsplayed",
    setswon: "/api/statistics/setswon",
    setswonpct: "/api/statistics/setswonpct",
    totalminutes: "/api/statistics/totalminutes",
    avgminutes: "/api/statistics/avgminutes",
  };

  const endpoint = statEndpoints[stat];
  if (!endpoint) throw new Error(`No API defined for stat: ${stat}`);

  const url = `${endpoint}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return await res.json();
}

function StatisticsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stat, setStatState] = useState(searchParams.get("stat") || "aces");
  const [surface, setSurface] = useState("all");
  const [year, setYear] = useState("all");
  const [tourneyLevel, setTourneyLevel] = useState("all");
  const [minMatches, setMinMatches] = useState(0);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 30;

  const setStat = (newStat) => {
    setStatState(newStat);
    const params = new URLSearchParams(searchParams.toString());
    params.set("stat", newStat);
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await calculatePlayerStats(stat, surface, year, tourneyLevel);
        setPlayerStats(data);
      } catch (err) {
        console.error(err);
        setPlayerStats([]);
      } finally {
        setLoading(false);
        setPage(1);
      }
    };
    fetchData();
  }, [stat, surface, year, tourneyLevel]);

  const filteredPlayers = playerStats.filter((p) => p.matches >= minMatches);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / limit));
  const paginatedPlayers = filteredPlayers.slice((page - 1) * limit, page * limit);

  const statLabels = useMemo(
    () => ({
      aces: "Aces",
      df: "Double Faults",
      "1stserve": "1st Serve %",
      "1stservewon": "1st Serve Won %",
      "2ndservewon": "2nd Serve Won %",
      servicewon: "Service Points Won %",
      bpsaved: "Break Points Saved %",
      bpwon: "Total Break Points Won %",
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
    }),
    []
  );

  const statLabel = statLabels[stat] ?? stat;

  return (
    <main className="mx-auto max-w-6xl p-4 bg-gray-900 text-white min-h-screen">
      <div className="mb-4 text-sm">
        <Link href="/" className="text-blue-400 hover:underline">
          ← Home
        </Link>
      </div>

      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Tennis Stats at a Glance</h1>
          <p className="text-gray-300">
            This tool calculates detailed performance statistics for tennis players based on match results.
            By aggregating data from multiple matches, it provides insights into a wide range of metrics...
          </p>
        </div>

        <div>
          <label className="mr-2 font-medium text-white">Stat:</label>
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(statLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <Filters
        surface={surface}
        onSurfaceChange={setSurface}
        year={year}
        onYearChange={setYear}
        tourneyLevel={tourneyLevel}
        onTourneyLevelChange={setTourneyLevel}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-white">
          Minimum Matches: {minMatches}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={minMatches}
          onChange={(e) => setMinMatches(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {loading ? (
        <p className="text-white">Loading...</p>
      ) : (
        <section className="mt-8">
          <div className="overflow-x-auto rounded border border-gray-700 bg-gray-800">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="border border-gray-600 px-2 py-2 text-left w-16 text-white">Rank</th>
                  <th className="border border-gray-600 px-2 py-2 text-left w-64 text-white">Player</th>
                  <th className="border border-gray-600 px-2 py-2 text-right w-20 text-white">Matches</th>
                  <th className="border border-gray-600 px-2 py-2 text-right w-20 text-white">{statLabel}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((p, idx) => {
                  const flag = flagEmoji(iocToIso2(p.ioc)) ?? "🏳️";
                  return (
                    <tr key={p.id} className="hover:bg-gray-700 border-b border-gray-600">
                      <td className="border border-gray-600 px-2 py-2 text-center w-16 text-white">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="border border-gray-600 px-2 py-2 w-64 text-white">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{flag}</span>
                          <Link
                            href={`/players/${encodeURIComponent(p.id)}`}
                            className="text-blue-400 hover:underline text-sm truncate"
                          >
                            {p.name}
                          </Link>
                        </div>
                      </td>
                      <td className="border border-gray-600 px-2 py-2 text-right w-20 text-white">{p.matches}</td>
                      <td className="border border-gray-600 px-2 py-2 text-right w-20 text-white">
                        {(
                          stat === "1stserve" ||
                          stat === "1stservewon" ||
                          stat === "2ndservewon" ||
                          stat === "servicewon" ||
                          stat === "bpsaved" ||
                          stat === "1streturnwon" ||
                          stat === "2ndreturnwon" ||
                          stat === "returnwon" ||
                          stat === "bpwon" ||
                          stat === "totalpointswonpct" ||
                          stat === "gameswonpct" ||
                          stat === "tiebreakswonpct" ||
                          stat === "setswonpct"
                        )
                          ? `${p.output.toFixed(1)}%`
                          : stat === "avgminutes"
                          ? p.output.toFixed(1)
                          : p.output}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
            >
              Prev
            </button>
            <span className="text-white">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StatisticsInner />
    </Suspense>
  );
}
