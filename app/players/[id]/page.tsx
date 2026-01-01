// app/players/[id]/page.tsx
import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = params;
  const sp = searchParams;

  // Recupera il giocatore dal DB
  const player = !slugParam.includes('-')
    ? await prisma.player.findUnique({ 
        where: { id: String(slugParam) }, 
        select: { id: true, player: true, atpname: true, slug: true } 
      })
    : await prisma.player.findUnique({ 
        where: { slug: slugParam }, 
        select: { id: true, player: true, atpname: true, slug: true } 
      });

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Redirect se accessed via ID numerico
  if (!slugParam.includes('-') && player.slug) {
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

  // Filtra match validi
  const filteredMatches = allMatches.filter(m => m.status !== false);

  // Totali e record
  const totalMatches = filteredMatches.length;
  const careerWins = filteredMatches.filter(m => m.winner_id === player.id).length;
  const careerLosses = totalMatches - careerWins;

  const clayWins = filteredMatches.filter(m => m.winner_id === player.id && m.surface === 'Clay').length;
  const hardWins = filteredMatches.filter(m => m.winner_id === player.id && m.surface === 'Hard').length;
  const grassWins = filteredMatches.filter(m => m.winner_id === player.id && m.surface === 'Grass').length;

  const clayLosses = filteredMatches.filter(m => m.loser_id === player.id && m.surface === 'Clay').length;
  const hardLosses = filteredMatches.filter(m => m.loser_id === player.id && m.surface === 'Hard').length;
  const grassLosses = filteredMatches.filter(m => m.loser_id === player.id && m.surface === 'Grass').length;

  const clayWinRate = (clayWins + clayLosses) > 0 ? Number(((clayWins / (clayWins + clayLosses)) * 100).toFixed(2)) : 0;
  const hardWinRate = (hardWins + hardLosses) > 0 ? Number(((hardWins / (hardWins + hardLosses)) * 100).toFixed(2)) : 0;
  const grassWinRate = (grassWins + grassLosses) > 0 ? Number(((grassWins / (grassWins + grassLosses)) * 100).toFixed(2)) : 0;

  // Conta titoli
  const titlesMapByTourney: Record<string, number> = {};
  const titlesMapByLevel: Record<string, number> = {};
  filteredMatches.filter(m => m.winner_id === player.id && m.round === 'F').forEach(m => {
    titlesMapByTourney[m.tourney_name] = (titlesMapByTourney[m.tourney_name] || 0) + 1;
    const lvl = m.tourney_level || 'Unknown';
    titlesMapByLevel[lvl] = (titlesMapByLevel[lvl] || 0) + 1;
  });

  const titlesByTourney = Object.entries(titlesMapByTourney).map(([tourney, count]) => ({ tourney, count }));
  const titlesByLevel = Object.entries(titlesMapByLevel).map(([level, count]) => ({ level, count }));
  const titlesTotal = titlesByTourney.reduce((acc, t) => acc + t.count, 0);

  // URL pubblico
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/players/${player.slug}${tab !== 'overview' ? `?tab=${tab}` : ''}`;

  // --- JSON-LD lato server ---
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.atpname || player.player,
    url,
    mainEntityOfPage: url,
    description: `Profile of ${player.atpname || player.player}.`,
    additionalProperty: [
      careerWins > 0 && { '@type': 'PropertyValue', name: 'Career Wins', value: careerWins, unitText: 'matches' },
      careerLosses > 0 && { '@type': 'PropertyValue', name: 'Career Losses', value: careerLosses, unitText: 'matches' },
      clayWins > 0 && { '@type': 'PropertyValue', name: 'Clay Wins', value: clayWins, unitText: 'matches' },
      hardWins > 0 && { '@type': 'PropertyValue', name: 'Hard Wins', value: hardWins, unitText: 'matches' },
      grassWins > 0 && { '@type': 'PropertyValue', name: 'Grass Wins', value: grassWins, unitText: 'matches' },
      clayWinRate > 0 && { '@type': 'PropertyValue', name: 'Clay Win %', value: clayWinRate, unitText: 'percent' },
      hardWinRate > 0 && { '@type': 'PropertyValue', name: 'Hard Win %', value: hardWinRate, unitText: 'percent' },
      grassWinRate > 0 && { '@type': 'PropertyValue', name: 'Grass Win %', value: grassWinRate, unitText: 'percent' },
      titlesTotal > 0 && { '@type': 'PropertyValue', name: 'Career Titles', value: titlesTotal, unitText: 'titles' },
      ...titlesByLevel.map(t => ({
        '@type': 'PropertyValue',
        name: t.level === 'G' ? 'Grand Slam Titles' : t.level === 'M' ? 'Masters Titles' : t.level,
        value: t.count,
        unitText: 'titles',
      })),
      ...titlesByTourney.map(t => ({
        '@type': 'PropertyValue',
        name: `${t.tourney} Titles`,
        value: t.count,
        unitText: 'titles',
      })),
    ].filter(Boolean),
    sameAs: [url],
    memberOf: { '@type': 'Organization', name: 'ATP Tour', url: 'https://www.atptour.com' },
  };

  return (
    <>
      {/* JSON-LD lato server */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Contenuti visibili */}
      <PlayerClient params={{ id: player.id, tab }} />
    </>
  );
}
