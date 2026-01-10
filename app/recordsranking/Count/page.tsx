import React from 'react';
import { getFlagFromIOC } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import RecordsCountControls from "./RecordsCountControls";

interface Player {
  id: string;
  name: string;
  ioc?: string | null;
  weeks: number;
}

export default async function RecordsCount({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const initialTop = Number((searchParams?.rank as string) ?? 1);
  const page = Number((searchParams?.page as string) ?? '1');
  const perPage = 20;

  // Server-side query (same logic as API route)
  const rank = initialTop;
  const weeksAtRank = await prisma.ranking.groupBy({
    by: ["playerId"],
    where: { rank },
    _count: { rankingDateId: true },
  });

  const playerIds = weeksAtRank.map(r => r.playerId);

  const playersRaw = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, atpname: true, ioc: true },
  });

  const nameMap = Object.fromEntries(playersRaw.map(p => [p.id, p.atpname]));
  const iocMap = Object.fromEntries(playersRaw.map(p => [p.id, p.ioc]));

  const result: Player[] = weeksAtRank
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

  const renderTable = (list: Player[], startIndex = 0) => (
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
              Weeks at No. {initialTop}
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
      {/* Controls (client component) */}
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsCountControls initialTop={initialTop} />
      </React.Suspense>

      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Weeks at No. {initialTop}
      </h2>

      {/* Tabella principale (server-rendered) */}
      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Simple server-side pagination links */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a
              key={i}
              href={`?rank=${initialTop}&page=${i + 1}`}
              className={`px-3 py-1 rounded ${i + 1 === page ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
