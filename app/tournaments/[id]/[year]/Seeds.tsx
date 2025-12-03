"use client";

import { useMemo } from "react";
import { Match } from "@/types";
import { getFlagFromIOC } from "@/lib/utils";

interface SeedsProps {
  id: string;
  year: string;
  matches: Match[];
}

export default function Seeds({ id, year, matches }: SeedsProps) {
  const seedOutcomes = useMemo(() => {
    if (!matches.length) return [];

    const seedsMap = new Map<
      number,
      { name: string; ioc: string; lastMatch: Match | null; outcome: string }
    >();

    for (const m of matches) {
      if (m.winner_seed && !seedsMap.has(m.winner_seed))
        seedsMap.set(m.winner_seed, {
          name: m.winner_name,
          ioc: m.winner_ioc,
          lastMatch: null,
          outcome: "",
        });
      if (m.loser_seed && !seedsMap.has(m.loser_seed))
        seedsMap.set(m.loser_seed, {
          name: m.loser_name,
          ioc: m.loser_ioc,
          lastMatch: null,
          outcome: "",
        });
    }

    const roundOrder = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];

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
            (roundOrder.indexOf(a.round) ?? Infinity) -
            (roundOrder.indexOf(b.round) ?? Infinity)
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
        data.outcome = "Winner 🏆";
      } else if (!isWinner) {
        data.outcome = `${lastMatch.round}, lost to ${getFlagFromIOC(
          opponentIOC
        )} ${opponentName}`;
      } else {
        data.outcome = `Reached ${lastMatch.round}, beat ${getFlagFromIOC(
          opponentIOC
        )} ${opponentName}`;
      }

      data.lastMatch = lastMatch;
    }

    return Array.from(seedsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([seed, data]) => ({
        seed,
        name: data.name,
        ioc: data.ioc,
        outcome: data.outcome,
      }));
  }, [matches]);

  // Split in due colonne: prima metà e seconda metà
  const mid = Math.ceil(seedOutcomes.length / 2);
  const leftColumn = seedOutcomes.slice(0, mid);
  const rightColumn = seedOutcomes.slice(mid);

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">Seeds Performance</h2>
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          {leftColumn.map(({ seed, name, ioc, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">
                {seed}. {getFlagFromIOC(ioc)} {name}
              </span>{" "}
              ({outcome})
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {rightColumn.map(({ seed, name, ioc, outcome }) => (
            <div key={seed} className="bg-gray-800 p-2 rounded">
              <span className="font-bold">
                {seed}. {getFlagFromIOC(ioc)} {name}
              </span>{" "}
              ({outcome})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
