import React from 'react';
import Flag from '@/components/Flag';
import { prisma } from "@/lib/prisma";
import RecordsCountControls from "../../Count/RecordsCountControls";
import ServerPagination from '@/components/ServerPagination';
import Link from "next/link";

interface Player {
  id?: string;
  name: string;
  ioc?: string | null;
  weeks: number;
  startDate?: string;
  endDate?: string;
}

export default async function StreakCount({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  // replicate server logic from API route
  const allRankings = await prisma.ranking.findMany({
    where: { rank },
    orderBy: [{ playerId: "asc" }, { rankingDate: { date: "asc" } }],
    select: {
      playerId: true,
      rankingDate: { select: { date: true } },
      player: { select: { id: true, atpname: true, ioc: true } },
    },
  });

  const resultMap: Record<string, Player & { weeks: number }> = {};

  let currentPlayerId: string | null = null;
  let currentPlayerInfo: { id?: string; name: string; ioc?: string | null } | null = null;
  let prevDate: Date | null = null;
  let currentStreak = 0;
  let maxStreak = 0;
  let streakStart: Date | null = null;
  let streakEnd: Date | null = null;
  let maxStreakStart: Date | null = null;
  let maxStreakEnd: Date | null = null;

  const commitPlayer = () => {
    if (!currentPlayerId || !currentPlayerInfo) return;
    const prev = resultMap[currentPlayerId];
    const best = Math.max(prev?.weeks ?? 0, maxStreak);

    resultMap[currentPlayerId] = {
      id: currentPlayerInfo.id,
      name: currentPlayerInfo.name,
      ioc: currentPlayerInfo.ioc ?? null,
      weeks: best,
      startDate: maxStreakStart?.toISOString().split("T")[0],
      endDate: maxStreakEnd?.toISOString().split("T")[0],
    } as Player & { weeks: number };
  };

  for (const r of allRankings) {
    if (r.playerId !== currentPlayerId) {
      commitPlayer();
      currentPlayerId = r.playerId;
      currentPlayerInfo = {
        id: r.player?.id,
        name: r.player?.atpname ?? r.playerId,
        ioc: r.player?.ioc ?? undefined,
      };
      prevDate = null;
      currentStreak = 0;
      maxStreak = 0;
      streakStart = null;
      streakEnd = null;
      maxStreakStart = null;
      maxStreakEnd = null;
    }

    if (prevDate) {
      const diffDays = Math.round(
        (r.rankingDate.date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 6 && diffDays <= 8) {
        currentStreak += 1;
        streakEnd = r.rankingDate.date;
      } else {
        currentStreak = 1;
        streakStart = r.rankingDate.date;
        streakEnd = r.rankingDate.date;
      }
    } else {
      currentStreak = 1;
      streakStart = r.rankingDate.date;
      streakEnd = r.rankingDate.date;
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      maxStreakStart = streakStart;
      maxStreakEnd = streakEnd;
    }

    prevDate = r.rankingDate.date;
  }

  commitPlayer();

  const resultArray: (Player & { weeks: number })[] = Object.values(resultMap).sort((a, b) => b.weeks - a.weeks);

  const totalPages = Math.ceil(resultArray.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = resultArray.slice(start, start + perPage);

  const renderTable = () => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start Date</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPlayers.map((p, idx) => {
            const globalRank = start + idx + 1;
            const flagEl = p.ioc ? <Flag ioc={p.ioc} /> : null;
            return (
              <tr key={`${p.id ?? p.name}-${start + idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flagEl}
                    {p.id ? (
                      <Link href={`/players/${p.id}`} className="hover:underline">{p.name}</Link>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate ?? "-"}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Consecutive Weeks at No. {rank}
      </h2>

      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsCountControls initialTop={rank} />
      </React.Suspense>

      {renderTable()}
    </section>
  );
}
