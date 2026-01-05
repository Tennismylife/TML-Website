// app/players/[id]/SEOPlayer.tsx
import React from 'react';

interface SEOPlayerProps {
  playerId: string | number;
  slug: string;
  name: string;
  atpname?: string;
  tab?: string;
  matches: any[]; // match già passati dal PlayerPage
}

export default function SEOPlayer({ playerId, slug, name, atpname, tab = 'overview', matches }: SEOPlayerProps) {
  const url = `https://stats.tennismylife.org/players/${slug}${tab !== 'overview' ? `?tab=${tab}` : ''}`;

  const filteredMatches = matches.filter(m => m.status !== false);

  // Totali e record
  const totalMatches = filteredMatches.length;
  const careerWins = filteredMatches.filter(m => m.winner_id === playerId).length;
  const careerLosses = totalMatches - careerWins;

  const clayWins = filteredMatches.filter(m => m.winner_id === playerId && m.surface === 'Clay').length;
  const hardWins = filteredMatches.filter(m => m.winner_id === playerId && m.surface === 'Hard').length;
  const grassWins = filteredMatches.filter(m => m.winner_id === playerId && m.surface === 'Grass').length;

  const clayLosses = filteredMatches.filter(m => m.loser_id === playerId && m.surface === 'Clay').length;
  const hardLosses = filteredMatches.filter(m => m.loser_id === playerId && m.surface === 'Hard').length;
  const grassLosses = filteredMatches.filter(m => m.loser_id === playerId && m.surface === 'Grass').length;

  const clayWinRate = (clayWins + clayLosses) > 0 ? Number(((clayWins / (clayWins + clayLosses)) * 100).toFixed(2)) : 0;
  const hardWinRate = (hardWins + hardLosses) > 0 ? Number(((hardWins / (hardWins + hardLosses)) * 100).toFixed(2)) : 0;
  const grassWinRate = (grassWins + grassLosses) > 0 ? Number(((grassWins / (grassWins + grassLosses)) * 100).toFixed(2)) : 0;

  const titlesMapByTourney: Record<string, number> = {};
  const titlesMapByLevel: Record<string, number> = {};
  filteredMatches.filter(m => m.winner_id === playerId && m.round === 'F').forEach(m => {
    titlesMapByTourney[m.tourney_name] = (titlesMapByTourney[m.tourney_name] || 0) + 1;
    const lvl = m.tourney_level || 'Unknown';
    titlesMapByLevel[lvl] = (titlesMapByLevel[lvl] || 0) + 1;
  });

  const titlesByTourney = Object.entries(titlesMapByTourney).map(([tourney, count]) => ({ tourney, count }));
  const titlesByLevel = Object.entries(titlesMapByLevel).map(([level, count]) => ({ level, count }));
  const titlesTotal = titlesByTourney.reduce((acc, t) => acc + t.count, 0);

  // JSON-LD
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: atpname || name,
    url,
    mainEntityOfPage: url,
    description: `Profile of ${atpname || name}.`,
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
