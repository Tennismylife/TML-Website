import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import SEOPlayer from './SEOPlayer';
import type { Metadata } from 'next';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const { id: slugParam } = await params;

  const player = !slugParam.includes('-')
    ? await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true } })
    : await prisma.player.findUnique({ where: { slug: slugParam }, select: { id: true, player: true, atpname: true, slug: true } });

  const name = player ? (player.atpname || player.player || `Player ${player.id}`) : 'Player not found';

  return {
    title: `Tennismylife - ${name} Matches`,
  };
}

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = await params;

  const player = !slugParam.includes('-')
    ? await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true } })
    : await prisma.player.findUnique({ where: { slug: slugParam }, select: { id: true, player: true, atpname: true, slug: true } });

  if (!player) return <div>Player not found</div>;

  const name = player.atpname || player.player || `Player ${player.id}`;
  const tab = (await searchParams)?.tab || 'overview';

  return (
    <>
      {/* JSON-LD invisibile per SEO */}
      <SEOPlayer playerId={player.id} slug={player.slug} name={name} atpname={player.atpname} tab={tab} />

      {/* Contenuti visibili */}
      <PlayerClient params={{ id: player.id, tab }} />
    </>
  );
}
