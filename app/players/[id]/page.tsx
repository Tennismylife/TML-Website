// app/players/[id]/page.tsx
import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import SEOPlayer from './SEOPlayer';
import { redirect } from 'next/navigation';

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = params;
  const sp = searchParams;

  if (!slugParam) return <div>Invalid player ID</div>;

  // Recupera il giocatore
  const player = !slugParam.includes('-')
    ? await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true } })
    : await prisma.player.findUnique({ where: { slug: slugParam }, select: { id: true, player: true, atpname: true, slug: true } });

  if (!player) return <div>Player not found</div>;

  // Redirect se accessed via ID
  if (!slugParam.includes('-')) {
    const search = sp?.tab ? `?tab=${sp.tab}` : '';
    redirect(`/players/${player.slug}${search}`);
    return null;
  }

  const name = player.atpname || player.player || `Player ${player.id}`;
  const tab = sp?.tab || 'overview';

  // Recupera tutti i match direttamente dal DB
  const allMatches = await prisma.match.findMany({
    where: { OR: [{ winner_id: player.id }, { loser_id: player.id }] },
    orderBy: { tourney_date: 'desc' }
  });

  return (
    <>
      {/* JSON-LD invisibile per SEO */}
      <SEOPlayer
        playerId={player.id}
        slug={player.slug}
        name={name}
        atpname={player.atpname}
        tab={tab}
        matches={allMatches} // PASSA I MATCH DIRETTAMENTE
      />

      {/* Contenuti visibili */}
      <PlayerClient params={{ id: player.id, tab }} />
    </>
  );
}
