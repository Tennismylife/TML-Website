"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Trophy, ArrowRight, RefreshCw } from "lucide-react";
import Flag from '@/components/Flag';
import { getSurfaceColor, getTextColorForRound } from "@/lib/colors";
import { getPlayerHref } from '@/lib/utils';
import { playerMatchesUrl } from '../../records/nav';

interface Match {
  year: number;
  tourney_id: number;
  tourney_date: string | Date;
  draw_size?: number;
  surface: string;
  tourney_name?: string | null;
  atpCategory?: string | null;
  winner_id: string;
  winner_name: string;
  winner_ioc: string;
  loser_id: string;
  loser_name: string;
  loser_ioc: string;
  score: string;
}

export default function TournamentClient({ id }: { id: number | string }) {
  const tournamentId = id;

  const [editions, setEditions] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch function extracted so it can be retried from the UI
  async function doFetch() {
    // Cleanup any previous controller
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const TIMEOUT_MS = 10000; // 10s
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      setLoading(true);
      setError(null);
      setShowRetry(false);

      timeoutId = setTimeout(() => {
        setError('Timeout: errore nel caricamento dei dati. Tocca Riprova.');
        try { controller.abort(); } catch (e) {}
      }, TIMEOUT_MS);

      const fetchStart = Date.now();
      try {
        console.info(`[TournamentClient] fetch start id=${tournamentId} ts=${new Date(fetchStart).toISOString()}`);
      } catch {}

      const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });

      const fetchDuration = Date.now() - fetchStart;
      try {
        console.info(`[TournamentClient] fetch finished id=${tournamentId} status=${res.status} durationMs=${fetchDuration}`);
      } catch {}

      if (!res.ok) {
        const text = await res.text().catch(() => '<no body>');
        console.error(`[TournamentClient] non-ok response status=${res.status} body=${text}`);
        throw new Error('Errore caricamento dati');
      }

      let data: any;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error('[TournamentClient] JSON parse error', parseErr);
        throw parseErr;
      }

      try {
        console.info(`[TournamentClient] parsed json editions=${(data.editionsData || []).length} metaCount=${data.meta?.count ?? 'n/a'}`);
      } catch {}

      const sorted: Match[] = (data.editionsData || []).sort(
        (a, b) => new Date(b.tourney_date).getTime() - new Date(a.tourney_date).getTime()
      );
      if (!isMountedRef.current) {
        try { console.warn(`[TournamentClient] setEditions called but component unmounted id=${tournamentId}`); } catch (e) {}
      }
      setEditions(sorted);
      try { console.info(`[TournamentClient] setEditions count=${sorted.length} first=${JSON.stringify(sorted[0])}`); } catch (e) {}
      try { performance && performance.mark && performance.mark('tournament.setEditions'); } catch (e) {}
      // Check DOM after next tick
      setTimeout(() => {
        try {
          const tbl = document.getElementById(`finals-table-${tournamentId}`);
          const rows = tbl ? tbl.querySelectorAll('tbody tr').length : -1;
          console.info(`[TournamentClient] DOM rows after setEditions id=${tournamentId} rows=${rows} isMounted=${isMountedRef.current}`);
        } catch (e) {}
      }, 50);
    } catch (err: any) {
      // Ignore AbortError (expected when we abort controller) to avoid noisy console logs
      if (err && err.name === 'AbortError') {
        // no-op
      } else {
        console.error('TournamentClient fetch error:', err);
        setError(err && err.message ? err.message : 'Errore caricamento dati');
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!id) return;
    isMountedRef.current = true;

    // Kick off the first fetch
    doFetch();

    return () => {
      isMountedRef.current = false;
      if (abortRef.current) try { abortRef.current.abort(); } catch (e) {}
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      try { console.info(`[TournamentClient] cleanup for id=${tournamentId}`); } catch (e) {}
    };
  }, [tournamentId]);

  // Show a retry action if loading takes too long (helps mobile users recover)
  useEffect(() => {
    if (!loading) {
      if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
      setShowRetry(false);
      return;
    }

    retryTimeoutRef.current = setTimeout(() => setShowRetry(true), 5000);
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, [loading]);

  // Debug: log when editions state updates (helps confirm state -> render)
  useEffect(() => {
    try { console.info(`[TournamentClient] editions state updated count=${editions.length}`); } catch (e) {}
    if (editions.length > 0) {
      try { performance && performance.measure && performance.measure('tournament.render', 'tournament.setEditions'); } catch (e) {}
    }

    // Also check the DOM after a frame to ensure rows are present
    const raf = requestAnimationFrame(() => {
      try {
        const tbl = document.getElementById(`finals-table-${tournamentId}`);
        const rows = tbl ? tbl.querySelectorAll('tbody tr').length : -1;
        console.info(`[TournamentClient] DOM rows after editions effect id=${tournamentId} rows=${rows}`);
      } catch (e) {}
    });
    return () => cancelAnimationFrame(raf);
  }, [editions]);

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

          {showRetry && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-300 mb-2">Se il caricamento è lento, prova a toccare il pulsante per riprovare.</p>
              <button
                onClick={() => doFetch()}
                className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              >
                Riprova
              </button>
            </div>
          )}
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
            <table id={`finals-table-${tournamentId}`} className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Edition</th>
                  <th className="px-4 py-2 text-left text-lg text-gray-200">Name</th>
                  <th className="px-4 py-2 text-center text-lg text-gray-200">Category</th>
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
                  const editionKey = `${m.tourney_id}-${m.year}-${new Date(m.tourney_date).getTime()}-${m.winner_id}-${m.loser_id}-${idx}`;
                  return (
                    <tr
                      key={editionKey}
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
                          {m.year}
                        </Link>
                      </td>

                      <td className="px-4 py-3 text-left text-gray-400 max-w-xs truncate" title={m.tourney_name || ''}>
                        {m.tourney_name || "–"}
                      </td>

                      <td className="px-4 py-3 text-center text-gray-400">{m.atpCategory ?? "–"}</td>

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
                          href={playerMatchesUrl((m as any).winner_slug ?? (m as any).winnerSlug ?? (m as any).winner?.slug ?? String(m.winner_id))}
                          className="flex items-center gap-3 text-gray-200 hover:text-yellow-400 transition"
                        >
                          {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                          <span className="font-medium">{m.winner_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={playerMatchesUrl((m as any).loser_slug ?? (m as any).loserSlug ?? (m as any).loser?.slug ?? String(m.loser_id))}
                          className="flex items-center gap-3 text-gray-400 hover:text-gray-200 transition"
                        >
                          {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
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

      {/* Debug JSON dump when ?debug=1 */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1' ? (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <pre className="text-xs text-left whitespace-pre-wrap max-h-96 overflow-auto bg-white/5 p-4 rounded">{JSON.stringify(editions, null, 2)}</pre>
        </div>
      ) : null}
    </main>
  );
}