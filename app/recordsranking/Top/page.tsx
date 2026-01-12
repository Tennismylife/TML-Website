import React from 'react';
import { getFlagFromIOC } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import RecordsTopControls from "./RecordsTopControls";
import ServerPagination from '@/components/ServerPagination';

interface TopXPlayer {
  id: string;
  name: string;
  ioc?: string | null;
  weeks: number;
}

export default async function RecordsTopX({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const initialTop = Number((sp.top as string) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  const top = initialTop;

  // Server-side query
  const weeksInTopX = await prisma.ranking.groupBy({
    by: ["playerId"],
    where: { rank: { lte: top } },
    _count: { rankingDateId: true },
  });

  const playerIds = weeksInTopX.map(r => r.playerId);

  const playersRaw = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, atpname: true, ioc: true },
  });

  const nameMap = Object.fromEntries(playersRaw.map(p => [p.id, p.atpname]));
  const iocMap = Object.fromEntries(playersRaw.map(p => [p.id, p.ioc]));

  const result: TopXPlayer[] = weeksInTopX
    .map(r => ({
      id: r.playerId,
      name: nameMap[r.playerId] ?? "Unknown",
      ioc: iocMap[r.playerId] ?? null,
      weeks: r._count.rankingDateId,
    }))
    .sort((a, b) => b.weeks - a.weeks);

  const totalCount = result.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = result.slice(start, start + perPage);

  const renderTable = (list: TopXPlayer[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Weeks in Top {initialTop}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {p.ioc && <span className="text-base">{getFlagFromIOC(p.ioc)}</span>}
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {p.weeks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={initialTop} />
      </React.Suspense>

      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Weeks at Top {initialTop}
      </h2>

      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

          {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?top=${initialTop}&page=${p}`} />
      )}
    </section>
  );
}
