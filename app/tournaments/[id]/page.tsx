"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, ArrowRight, RefreshCw } from "lucide-react";
import { getFlagFromIOC } from "@/lib/utils";
import { getSurfaceColor, getTextColorForRound } from "@/lib/colors";
import TournamentHeader from "./TournamentHeader";

interface Match {
  year: number;
  tourney_id: number;
  tourney_date: string | Date;
  draw_size?: number;
  surface: string;
  winner_id: string;
  winner_name: string;
  winner_ioc: string;
  loser_id: string;
  loser_name: string;
  loser_ioc: string;
  score: string;
}

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = id;
  
  const [editions, setEditions] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Errore caricamento dati");
        const data = await res.json();
        const sorted: Match[] = (data.editionsData || []).sort(
          (a, b) => new Date(b.tourney_date).getTime() - new Date(a.tourney_date).getTime()
        );
        setEditions(sorted);
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [tournamentId]);

  const mostTitles = useMemo(() => {
    const winnerMap = editions.reduce((acc, m) => {
      if (!acc[m.winner_id]) {
        acc[m.winner_id] = {
          player_id: m.winner_id,
          player_name: m.winner_name,
          player_ioc: m.winner_ioc,
          wins: 0,
        };
      }
      acc[m.winner_id].wins += 1;
      return acc;
    }, {} as Record<string, any>);
    return Object.values(winnerMap).sort((a, b) => b.wins - a.wins);
  }, [editions]);

  function fmtDate(d?: string | Date | null): string {
    if (!d) return "n/d";
    const date = d instanceof Date ? d : new Date(d);
    return !isNaN(date.getTime()) ? date.getFullYear().toString() : "n/d";
  }

  if (!tournamentId) return <div>ID del torneo mancante</div>;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <TournamentHeader id={parseInt(tournamentId)} />
        <div className="max-w-7xl mx-auto px-6 pt-20 flex flex-col items-center space-y-8">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full animate-pulse blur-xl opacity-50" />
            <Trophy className="absolute inset-0 m-auto w-20 h-20 text-yellow-400 animate-bounce" />
          </div>
          <div className="space-y-4 w-full max-w-4xl">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 backdrop-blur rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl font-bold text-red-500">Oops!</div>
          <p className="text-xl text-gray-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-full text-lg font-bold transition-all hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
            Riprova
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <TournamentHeader id={parseInt(tournamentId)} />

      {/* CTA Records */}
      <div className="flex justify-center my-12">
        <Link
          href={`/tournaments/${tournamentId}/records`}
          className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xl rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-110 transition-all duration-500 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
          <Trophy className="w-8 h-8" />
          <span>VIEW RECORDS</span>
          <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>

      {/* Table of finals */}
      <div className="max-w-7xl mx-auto px-6 pb-20 space-y-20">
        <section>
          <div className="overflow-x-auto rounded bg-gray-900 shadow">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Edition</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Surface</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Draw</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Champion</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Finalist</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {editions.map((m, idx) => {
                  const isRecent = idx === 0;
                  return (
                    <tr
                      key={`${m.tourney_id}-${m.year}`}
                      className={`hover:bg-white/5 transition ${
                        isRecent ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/tournaments/${m.tourney_id}/${m.year}`}
                          className="text-blue-400 hover:underline font-medium"
                        >
                          {isRecent && <Trophy className="inline w-5 h-5 mr-1 animate-pulse" />}
                          {fmtDate(m.tourney_date)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.surface ? (
                          <span
                            className="text-sm font-medium px-3 py-1 rounded-full shadow-md"
                            style={{
                              backgroundColor: getSurfaceColor(m.surface) || "#888",
                              color: getTextColorForRound(getSurfaceColor(m.surface) || "#888"),
                            }}
                          >
                            {m.surface}
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">{m.draw_size || "–"}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/players/${m.winner_id}`}
                          className="flex items-center gap-3 text-gray-200 hover:text-yellow-400 transition"
                        >
                          <span className="text-2xl">{getFlagFromIOC(m.winner_ioc) || ""}</span>
                          <span className="font-medium">{m.winner_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/players/${m.loser_id}`}
                          className="flex items-center gap-3 text-gray-400 hover:text-gray-200 transition"
                        >
                          <span className="text-2xl">{getFlagFromIOC(m.loser_ioc) || ""}</span>
                          <span>{m.loser_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center font-mono tracking-wider">{m.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
