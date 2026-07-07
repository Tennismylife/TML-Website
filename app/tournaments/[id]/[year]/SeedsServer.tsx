import Flag from '@/components/Flag';
import Link from 'next/link';
import type { Match } from '@/types';
import { getRoundColor, getTextColorForRound } from '@/lib/colors';
import React from 'react';

// Server-side RoundBadge using shared color logic
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

export default async function SeedsServer(props: any) {
  const { id, year, matches } = props;
  if (!matches || matches.length === 0) return null;

  const seedsMap = new Map<number, { name: string; ioc?: string | undefined; slug?: string | null; lastMatch: Match | null; outcome: React.ReactNode }>();

  for (const m of matches) {
    if (m.winner_seed && !seedsMap.has(m.winner_seed))
      seedsMap.set(m.winner_seed, {
        name: m.winner_name ?? "",
        ioc: m.winner_ioc ?? undefined,
        slug: (m as any).winner_slug ?? null,
        lastMatch: null,
        outcome: "",
      });
    if (m.loser_seed && !seedsMap.has(m.loser_seed))
      seedsMap.set(m.loser_seed, {
        name: m.loser_name ?? "",
        ioc: m.loser_ioc ?? undefined,
        slug: (m as any).loser_slug ?? null,
        lastMatch: null,
        outcome: "",
      });
  }

  const roundOrder = ["R128", "R64", "R32", "R16", "RR", "QF", "SF", "F"];

  for (const [seed, data] of seedsMap) {
    const playerMatches = matches.filter(m => m.winner_seed === seed || m.loser_seed === seed);
    if (!playerMatches.length) {
      data.outcome = "Did not play";
      continue;
    }

    const lastMatch = playerMatches
      .slice()
      .sort((a, b) => (roundOrder.indexOf(a.round ?? "") ?? Infinity) - (roundOrder.indexOf(b.round ?? "") ?? Infinity))
      .at(-1);

    if (!lastMatch) continue;

    const isWinner = lastMatch.winner_seed === seed;
    const opponentName = isWinner ? lastMatch.loser_name : lastMatch.winner_name;
    const opponentIOC = isWinner ? lastMatch.loser_ioc : lastMatch.winner_ioc;

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

  const seedOutcomes = Array.from(seedsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([seed, data]) => ({ seed, name: data.name, ioc: data.ioc, slug: data.slug, outcome: data.outcome }));

  // Determine surface for links (use first match with a surface value)
  const rawSurface = matches.find((m: any) => m.surface)?.surface ?? null;
  const surfacePath = rawSurface ? String(rawSurface).toLowerCase() : null;

  const mid = Math.ceil(seedOutcomes.length / 2);
  const leftColumn = seedOutcomes.slice(0, mid);
  const rightColumn = seedOutcomes.slice(mid);

  return (
    <div id="server-seeds" className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">Seeds Performance</h2>

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          {leftColumn.map(({ seed, name, ioc, slug, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">{seed}. <Flag ioc={ioc} className="w-4 h-3 inline-block mr-1" />{' '}
                {slug && surfacePath ? (
                  <Link href={`/players/${slug}/${surfacePath}`} className="hover:underline text-white">{name}</Link>
                ) : name}
              </span>{' '}({outcome})
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {rightColumn.map(({ seed, name, ioc, slug, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">{seed}. <Flag ioc={ioc} className="w-4 h-3 inline-block mr-1" />{' '}
                {slug && surfacePath ? (
                  <Link href={`/players/${slug}/${surfacePath}`} className="hover:underline text-white">{name}</Link>
                ) : name}
              </span>{' '}({outcome})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
