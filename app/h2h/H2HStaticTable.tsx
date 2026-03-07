"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from '@/lib/utils';
import { lastNMatches, playerResultsForMatches } from '@/lib/h2hUtils';

interface Player {
  id?: string | number;
  atpname?: string | null;
  ioc?: string | null;
  slug?: string | null;
}

interface Match {
  winner_id?: string | number | null;
  loser_id?: string | number | null;
  winner_name?: string | null;
  tourney_date?: string | number | Date | null;
  status?: boolean | null;
  score?: string | null;
}

interface Props {
  player1: Player; // Sinner (right in the visual)
  player2: Player; // Alcaraz (left in the visual)
  matches: Match[];
}

// Minimal, static table used only for the bottom-left H2H widget
export default function H2HStaticTable({ player1, player2, matches }: Props) {
  const tableRef = React.useRef<HTMLTableElement | null>(null);
  const counted = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.status !== false &&
          !(
            (m.score ?? '').toUpperCase().includes('DEF') ||
            (m.score ?? '').toUpperCase().includes('W/O') ||
            (m.score ?? '').toUpperCase().includes('WEA')
          )
      ),
    [matches]
  );

  React.useEffect(() => {
    if (!tableRef.current) return;

    const neutralizeVisuals = (e: HTMLElement) => {
      e.style.setProperty('mix-blend-mode', 'normal', 'important');
      e.style.setProperty('filter', 'none', 'important');
      e.style.setProperty('text-shadow', 'none', 'important');
      e.style.setProperty('background-clip', 'border-box', 'important');
      e.style.setProperty('-webkit-background-clip', 'border-box', 'important');
      e.style.setProperty('opacity', '1', 'important');
      e.style.setProperty('-webkit-text-stroke-width', '0', 'important');
    };

    tableRef.current.querySelectorAll('[data-h2h-name]').forEach((el) => {
      const e = el as HTMLElement;
      e.style.setProperty('color', '#FFFFFF', 'important');
      e.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important');
      neutralizeVisuals(e);
    });

    tableRef.current.querySelectorAll('[data-h2h-color]').forEach((el) => {
      const e = el as HTMLElement;
      const v = e.getAttribute('data-h2h-color');
      if (v === 'green') {
        e.style.setProperty('color', '#4ade80', 'important');
        e.style.setProperty('-webkit-text-fill-color', '#4ade80', 'important');
        neutralizeVisuals(e);
      } else if (v === 'red') {
        e.style.setProperty('color', '#f87171', 'important');
        e.style.setProperty('-webkit-text-fill-color', '#f87171', 'important');
        neutralizeVisuals(e);
      }
    });
  }, [player1, player2, matches]);

  // Replica la stessa logica di H2HMatches.tsx: m.winner_id === playerId
  const leftId = String(player2.id ?? '');
  const rightId = String(player1.id ?? '');

  const wins1 = counted.filter((m) => String(m.winner_id ?? '') === rightId).length;
  const wins2 = counted.filter((m) => String(m.winner_id ?? '') === leftId).length;
  const total = wins1 + wins2;
  const pct1 = total > 0 ? ((wins1 / total) * 100).toFixed(1) : '0.0';
  const pct2 = total > 0 ? ((wins2 / total) * 100).toFixed(1) : '0.0';

  // Use same logic as H2HHeaderServer: lastNMatches + playerResultsForMatches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastFive = lastNMatches(counted as any[], 5);
  const leftResults = playerResultsForMatches(player2.id, player2.atpname, lastFive);
  const rightResults = playerResultsForMatches(player1.id, player1.atpname, lastFive);

  // Derive the full H2H page slug dynamically from player slugs
  const h2hSlug =
    `${player2.slug ?? player2.atpname ?? 'player'}-vs-${player1.slug ?? player1.atpname ?? 'player'}`
      .toLowerCase()
      .replace(/\s+/g, '-');

  return (
    <div className="w-full overflow-x-auto">
      <table
        ref={tableRef}
        className="h2h-static w-full bg-gray-800 text-left rounded-lg overflow-hidden border border-white/10"
        role="table"
        aria-label="H2H static preview"
      >
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-3 align-middle">
              <div className="flex items-center gap-3">
                {player2.ioc ? (
                  <Flag ioc={player2.ioc} className="w-6 h-4 rounded-sm object-cover" />
                ) : null}
                <Link
                  data-h2h-name
                  href={getPlayerHrefWithTab(player2.slug ?? String(player2.id), 'matches')}
                  className="text-lg font-bold text-gray-100 hover:underline"
                >
                  {player2.atpname}
                </Link>
              </div>
            </th>
            <th className="p-3 text-right align-middle">
              <div className="flex items-center justify-end gap-3">
                <Link
                  data-h2h-name
                  href={getPlayerHrefWithTab(player1.slug ?? String(player1.id), 'matches')}
                  className="text-lg font-bold text-gray-100 hover:underline text-right"
                >
                  {player1.atpname}
                </Link>
                {player1.ioc ? (
                  <Flag ioc={player1.ioc} className="w-6 h-4 rounded-sm object-cover" />
                ) : null}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan={2} className="p-4 text-center">
              <div className="text-4xl md:text-5xl md:text-6xl font-bold mb-1">
                <span
                  data-h2h-color="green"
                  className="text-green-400 mr-3"
                  style={{ color: '#4ade80' }}
                >
                  {wins2}
                </span>
                <span className="text-gray-400" style={{ color: '#9ca3af' }}>
                  -
                </span>
                <span
                  data-h2h-color="red"
                  className="text-red-400 ml-3"
                  style={{ color: '#f87171' }}
                >
                  {wins1}
                </span>
              </div>
              <div className="text-sm md:text-lg text-gray-300 font-semibold mb-2">
                <span
                  data-h2h-color="green"
                  className="text-green-400"
                  style={{ color: '#4ade80' }}
                >
                  Wins: {pct2}%
                </span>
                <span className="text-gray-400 mx-2" style={{ color: '#9ca3af' }}>
                  {' '}-{' '}
                </span>
                <span
                  data-h2h-color="red"
                  className="text-red-400"
                  style={{ color: '#f87171' }}
                >
                  {pct1}%
                </span>
              </div>
            </td>
          </tr>

          <tr className="border-t border-white/10">
            <td className="p-3 align-middle">
              <div className="flex items-center gap-2">
                {leftResults.map((r, i) => (
                  <div
                    key={`a-${i}`}
                    data-h2h-color={r === 'W' ? 'green' : 'red'}
                    className="font-bold text-2xl"
                    style={{ color: r === 'W' ? '#4ade80' : '#f87171' }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </td>
            <td className="p-3 align-middle text-right">
              <div className="flex items-center gap-2 justify-end">
                {rightResults.map((r, i) => (
                  <div
                    key={`s-${i}`}
                    data-h2h-color={r === 'W' ? 'green' : 'red'}
                    className="font-bold text-2xl"
                    style={{ color: r === 'W' ? '#4ade80' : '#f87171' }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </td>
          </tr>
          <tr className="border-t border-white/10">
            <td colSpan={2} className="p-3 text-center">
              <Link
                href={`/h2h/${h2hSlug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 shadow-lg hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: '#FFFFFF',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
                Full H2H Stats
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
