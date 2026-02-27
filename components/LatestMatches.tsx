"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { getTourneyHref, getPlayerHref, getPlayerHrefWithTab, formatDateISO, createH2HUrl } from "@/lib/utils";

interface Match {
  id: string | number;
  tourney_id?: string | null;
  tourney_name?: string | null;
  tourney_date?: string | null;
  round?: string | null;
  winner_id?: string | number | null;
  winner_name?: string | null;
  winner_ioc?: string | null;
  loser_id?: string | number | null;
  loser_name?: string | null;
  loser_ioc?: string | null;
  score?: string | null;
  year?: number | null;
}

export default function LatestMatches() {
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [flagEmojiSupported, setFlagEmojiSupported] = useState<boolean | null>(null);

  // Detect whether the browser renders flag emoji as flags (vs two-letter glyphs)
  useEffect(() => {
    let mounted = true;
    const detect = () => {
      try {
        const emoji = '🇺🇸';
        const letters = 'US';
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.visibility = 'hidden';
        const spanEmoji = document.createElement('span');
        spanEmoji.textContent = emoji;
        spanEmoji.style.fontSize = '20px';
        const spanLetters = document.createElement('span');
        spanLetters.textContent = letters;
        spanLetters.style.fontSize = '20px';
        container.appendChild(spanEmoji);
        container.appendChild(spanLetters);
        document.body.appendChild(container);
        const emojiWidth = spanEmoji.getBoundingClientRect().width;
        const lettersWidth = spanLetters.getBoundingClientRect().width;
        document.body.removeChild(container);
        const supported = emojiWidth > lettersWidth * 0.9; // emoji typically wider than letters
        if (mounted) setFlagEmojiSupported(Boolean(supported));
      } catch (e) {
        if (mounted) setFlagEmojiSupported(false);
      }
    };
    // run on next tick to ensure fonts loaded
    const t = setTimeout(detect, 50);
    return () => { mounted = false; clearTimeout(t); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMatchesLoading(true);

    fetch("/api/matches/latest")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecentMatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error fetching latest matches:", err))
      .finally(() => !cancelled && setMatchesLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">📅</span>
          <h2 className="text-base font-semibold text-gray-100">
            Latest Matches
          </h2>
          <span className="text-xs text-gray-400 ml-3" data-testid="flag-emoji-support" aria-hidden="true" />
        </div>
        <span className="text-xs text-gray-400">
          Showing last 10 matches
        </span>
      </div>

      {/* Loading */}
      {matchesLoading ? (
        <div className="animate-pulse">
          <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black">
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Date
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Tournament
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Round
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  H2H
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Winner
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Loser
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Score
                </th>
              </tr>
            </thead>

            <tbody>
              {recentMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-center text-sm text-gray-400"
                  >
                    No recent matches available
                  </td>
                </tr>
              ) : (
                recentMatches.map((m) => {
                  const tourneyId = m.tourney_id ?? null;
                  const wSlug = (m as any).winner_slug as string | null;
                  const lSlug = (m as any).loser_slug as string | null;
                  // Build H2H href: prefer DB slugs, then name-based slugs, then ID-based fallback
                  const h2hHref = (() => {
                    if (wSlug && lSlug) {
                      const [a, b] = wSlug <= lSlug ? [wSlug, lSlug] : [lSlug, wSlug];
                      return `/h2h/${a}-vs-${b}`;
                    }
                    if (m.winner_name && m.loser_name) {
                      return createH2HUrl(m.winner_name, m.loser_name);
                    }
                    const wId = m.winner_id ? String(m.winner_id) : null;
                    const lId = m.loser_id ? String(m.loser_id) : null;
                    if (wId && lId) {
                      const [a, b] = wId <= lId ? [wId, lId] : [lId, wId];
                      return `/h2h/${a}-vs-${b}`;
                    }
                    return null;
                  })();

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-gray-800 border-b border-white/10"
                    >
                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.tourney_date ? formatDateISO(m.tourney_date) : "-"}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.tourney_name ? (
                          tourneyId ? (
                            <Link
                              href={
                                (m as any).tourney_slug
                                  ? getTourneyHref({ slug: (m as any).tourney_slug, year: m.year })
                                  : getTourneyHref({ id: tourneyId, year: m.year })
                              }
                              className="text-indigo-300 hover:underline"
                            >
                              {m.tourney_name}
                            </Link>
                          ) : (
                            m.tourney_name
                          )
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.round || "-"}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center">
                        {h2hHref ? (
                          <Link
                            href={h2hHref}
                            className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors whitespace-nowrap"
                          >
                            H2H
                          </Link>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          {m.winner_ioc && (
                            <Flag ioc={m.winner_ioc} className="w-4 h-3" />
                          )}
                          {m.winner_name ? (
                            <Link
                              href={getPlayerHrefWithTab((m as any).winner_slug ?? String(m.winner_id || m.winner_name), 'matches')}
                              className="text-indigo-300 hover:underline"
                            >
                              {m.winner_name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          {m.loser_ioc && (
                            <Flag ioc={m.loser_ioc} className="w-4 h-3" />
                          )}
                          {m.loser_name ? (
                            <Link
                              href={getPlayerHrefWithTab((m as any).loser_slug ?? String(m.loser_id || m.loser_name), 'matches')}
                              className="text-indigo-300 hover:underline"
                            >
                              {m.loser_name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.score || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
