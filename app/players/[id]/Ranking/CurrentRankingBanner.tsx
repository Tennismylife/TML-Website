import React from 'react';
import { prisma } from '../../../../lib/prisma';

interface Props {
  playerId: string;
}

// This component runs on the server. It fetches the most recent ranking row for
// the given player and renders a static banner. Because it's included in the
// parent page (which is a server component) the generated HTML will be visible
// in the page source right away.
export default async function CurrentRankingBanner({ playerId }: Props) {
  if (!playerId) return null;

  // Find the most recent ranking date globally
  const latestDate = await prisma.rankingDate.findFirst({
    orderBy: { date: 'desc' },
  });

  if (!latestDate) return null;

  // Check if the player appears in that specific ranking
  const latest = await prisma.ranking.findFirst({
    where: { playerId: String(playerId), rankingDateId: latestDate.id },
    include: { rankingDate: true },
  });

  if (!latest) return null;

  const dateStr = latest.rankingDate?.date
    ? new Date(latest.rankingDate.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-start gap-4">
      <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-2 shadow">
        <div className="flex flex-col items-center justify-center bg-yellow-500/15 border border-yellow-500/30 rounded px-1.5 py-0.5 min-w-[32px]">
          <span className="text-[9px] font-black text-yellow-400 tracking-[0.2em] uppercase leading-none">ATP</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black text-yellow-300 leading-none tracking-tight">#{latest.rank}</span>
          <span className="text-[10px] text-gray-400 leading-none mt-0.5">Current ranking</span>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-2 shadow">
        <div className="flex flex-col items-center justify-center bg-blue-500/15 border border-blue-500/30 rounded px-1.5 py-0.5 min-w-[32px]">
          <span className="text-[9px] font-black text-blue-400 tracking-[0.2em] uppercase leading-none">PTS</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black text-blue-300 leading-none tracking-tight">{latest.points.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 leading-none mt-0.5">Current ATP points</span>
        </div>
      </div>
      {dateStr && <span className="text-xs text-gray-500">as of {dateStr}</span>}
    </div>
  );
}
