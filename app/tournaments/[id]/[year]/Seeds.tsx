"use client";

import type { ReactNode } from 'react';
import { useMemo, useState, useEffect } from "react";
import { Match } from "@/types";
import Flag from '@/components/Flag';
import { getRoundColor, getTextColorForRound } from '@/lib/colors';
import Link from 'next/link';
import { getPlayerHrefWithTab } from '@/lib/utils';

// Small helper to render a colored badge for rounds using shared color logic
function RoundBadge({ round }: { round?: string | null }) {
  const r = (round || '').toString();
  if (!r) return null;
  const bg = getRoundColor(r);
  const color = getTextColorForRound(bg);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold`} style={{ backgroundColor: bg, color }}>
      {r}
    </span>
  );
} 

interface SeedsProps {
  id: string;
  year: string;
  matches: Match[];
}

export default function Seeds({ id, year, matches }: SeedsProps) {
  const seedOutcomes = useMemo(() => {
    if (!matches.length) return [];

    const rawSurface = matches.find((m) => m.surface)?.surface ?? null;
    const surfacePath = rawSurface ? String(rawSurface).toLowerCase() : null;

    const seedsMap = new Map<
      number,
      { name: string; ioc?: string | undefined; slug?: string | null; surfacePath?: string | null; rawSurface?: string | null; lastMatch: Match | null; outcome: ReactNode }
    >();

    for (const m of matches) {
      if (m.winner_seed && !seedsMap.has(m.winner_seed))
        seedsMap.set(m.winner_seed, {
          name: m.winner_name ?? "",
          ioc: m.winner_ioc ?? undefined,
          slug: (m as any).winner_slug ?? null,
          surfacePath,
          rawSurface,
          lastMatch: null,
          outcome: "",
        });
      if (m.loser_seed && !seedsMap.has(m.loser_seed))
        seedsMap.set(m.loser_seed, {
          name: m.loser_name ?? "",
          ioc: m.loser_ioc ?? undefined,
          slug: (m as any).loser_slug ?? null,
          surfacePath,
          rawSurface,
          lastMatch: null,
          outcome: "",
        });
    }

    const roundOrder = ["R128", "R64", "R32", "R16", "RR", "QF", "SF", "F"];

    for (const [seed, data] of seedsMap) {
      const playerMatches = matches.filter(
        m => m.winner_seed === seed || m.loser_seed === seed
      );

      if (!playerMatches.length) {
        data.outcome = "Did not play";
        continue;
      }

      const lastMatch = playerMatches
        .slice()
        .sort(
          (a, b) =>
            (roundOrder.indexOf(a.round ?? "") ?? Infinity) -
            (roundOrder.indexOf(b.round ?? "") ?? Infinity)
        )
        .at(-1);

      if (!lastMatch) continue;

      const isWinner = lastMatch.winner_seed === seed;

      const opponentName = isWinner
        ? lastMatch.loser_name
        : lastMatch.winner_name;
      const opponentIOC = isWinner
        ? lastMatch.loser_ioc
        : lastMatch.winner_ioc;

      if (lastMatch.round === "F" && isWinner) {
        data.outcome = (
          <>
            <RoundBadge round={lastMatch.round} />
            <span className="ml-2">Winner 🏆</span>
          </>
        );
      } else if (!isWinner) {
        data.outcome = (
          <>
            <RoundBadge round={lastMatch.round} />
            <span className="ml-2">lost to <Flag ioc={opponentIOC ?? undefined} className="w-4 h-3 inline-block mr-1" /> {opponentName ?? ""}</span>
          </>
        );
      } else {
        data.outcome = (
          <>
            <RoundBadge round={lastMatch.round} />
            <span className="ml-2">beat <Flag ioc={opponentIOC ?? undefined} className="w-4 h-3 inline-block mr-1" /> {opponentName ?? ""}</span>
          </>
        );
      }

      data.lastMatch = lastMatch;
    }

    return Array.from(seedsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([seed, data]) => ({
        seed,
        name: data.name,
        ioc: data.ioc,
        slug: data.slug,
        surfacePath: data.surfacePath,
        rawSurface: data.rawSurface,
        outcome: data.outcome,
      }));
  }, [matches]);

  // Split in due colonne: prima metà e seconda metà
  const mid = Math.ceil(seedOutcomes.length / 2);
  const leftColumn = seedOutcomes.slice(0, mid);
  const rightColumn = seedOutcomes.slice(mid);

  // Ensure we don't render the client seeds until we've removed any server-side seeds
  const [mounted, setMounted] = useState<boolean>(() => !(matches && matches.length));

  useEffect(() => {
    if (!matches || !matches.length) {
      setMounted(true);
      return;
    }

    const el = typeof document !== 'undefined' ? document.getElementById('server-seeds') : null;
    try {
      if (el) {
        (el as any).style = (el as any).style || {};
        (el as any).style.display = 'none';
      }
    } catch (e) {
      // ignore
    }
    requestAnimationFrame(() => setMounted(true));
  }, [matches]);

  if (!mounted) return null;

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">Seeds Performance</h2>

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          {leftColumn.map(({ seed, name, ioc, slug, surfacePath, rawSurface, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">
                {seed}. <Flag ioc={ioc} className="w-4 h-3 inline-block mr-1" />{' '}
                {slug && surfacePath ? (
                  <Link href={getPlayerHrefWithTab(slug, surfacePath)} className="hover:underline text-white">{name}</Link>
                ) : name}
                {slug && surfacePath && rawSurface && (
                  <Link href={getPlayerHrefWithTab(slug, surfacePath)} className="ml-2 text-[0.65rem] text-cyan-500 hover:underline" title={`${name} ${rawSurface} stats`}>{rawSurface}</Link>
                )}
              </span>{" "}
              ({outcome})
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {rightColumn.map(({ seed, name, ioc, slug, surfacePath, rawSurface, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">
                {seed}. <Flag ioc={ioc} className="w-4 h-3 inline-block mr-1" />{' '}
                {slug && surfacePath ? (
                  <Link href={getPlayerHrefWithTab(slug, surfacePath)} className="hover:underline text-white">{name}</Link>
                ) : name}
                {slug && surfacePath && rawSurface && (
                  <Link href={getPlayerHrefWithTab(slug, surfacePath)} className="ml-2 text-[0.65rem] text-cyan-500 hover:underline" title={`${name} ${rawSurface} stats`}>{rawSurface}</Link>
                )}
              </span>{" "}
              ({outcome})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
