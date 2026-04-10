// app/players/[id]/SEOPlayer.tsx
import React from 'react';

type MatchLite = {
  status?: boolean | null;
  winner_id?: string | number | null;
  loser_id?: string | number | null;
  surface?: string | null;
};

// Minimal IOC -> Country map to improve JSON-LD nationality readability (extend as needed)
const IOC_TO_COUNTRY: Record<string, string> = {
  USA: 'United States',
  SRB: 'Serbia',
  ESP: 'Spain',
  SUI: 'Switzerland',
  ARG: 'Argentina',
  GBR: 'United Kingdom',
  AUS: 'Australia',
  ITA: 'Italy',
  GER: 'Germany',
  CRO: 'Croatia',
  FRA: 'France',
  RUS: 'Russia',
  BRA: 'Brazil',
  NED: 'Netherlands',
  BEL: 'Belgium',
  SWE: 'Sweden',
  CZE: 'Czech Republic',
  CHN: 'China',
  JPN: 'Japan',
  CAN: 'Canada',
  POL: 'Poland',
  COL: 'Colombia',
  ISR: 'Israel',
  KOR: 'South Korea',
  PRT: 'Portugal',
  MEX: 'Mexico',
  DEN: 'Denmark',
  IND: 'India',
  IRL: 'Ireland',
  AUT: 'Austria',
  NOR: 'Norway',
  SVK: 'Slovakia',
  ROU: 'Romania',
  BUL: 'Bulgaria',
  HUN: 'Hungary',
  NZL: 'New Zealand',
};

function mapIocToCountry(ioc?: string | null): string | null {
  if (!ioc) return null;
  const code = String(ioc).toUpperCase().trim();
  return IOC_TO_COUNTRY[code] ?? null;
}

interface SEOPlayerProps {
  playerId: string | number;
  slug: string;
  name: string;
  atpname?: string | null;
  tab?: string | null;
  birthdate?: string | null;
  ioc?: string | null; // country IOC code
  birthplace?: string | null;
  matches?: MatchLite[]; // optional: small sample
  // Optional server-provided summary to avoid requiring the full `matches` array
  summary?: {
    total?: number;
    wins?: number;
    losses?: number;
    surfaceWins?: Record<string, number>;
    surfaceLosses?: Record<string, number>;
  };
}

export default function SEOPlayer({ playerId, slug, name, atpname, tab = 'overview', birthdate, ioc, birthplace, matches, summary }: SEOPlayerProps) {
  // Prefer server-provided summary when available to avoid scanning large match arrays
  const total = summary?.total ?? (matches || []).filter((m) => m?.status !== false).length;
  const wins = summary?.wins ?? (matches || []).filter((m) => String(m.winner_id) === String(playerId)).length;
  const losses = summary?.losses ?? (total - wins);

  const surf = (s?: string | null) => (s || '').toLowerCase();
  const clayWins = summary?.surfaceWins?.Clay ?? (matches || []).filter((m) => String(m.winner_id) === String(playerId) && /clay/i.test(surf(m.surface))).length;
  const hardWins = summary?.surfaceWins?.Hard ?? (matches || []).filter((m) => String(m.winner_id) === String(playerId) && /hard/i.test(surf(m.surface))).length;
  const grassWins = summary?.surfaceWins?.Grass ?? (matches || []).filter((m) => String(m.winner_id) === String(playerId) && /grass/i.test(surf(m.surface))).length;

  const clayLosses = summary?.surfaceLosses?.Clay ?? (matches || []).filter((m) => String(m.loser_id) === String(playerId) && /clay/i.test(surf(m.surface))).length;
  const hardLosses = summary?.surfaceLosses?.Hard ?? (matches || []).filter((m) => String(m.loser_id) === String(playerId) && /hard/i.test(surf(m.surface))).length;
  const grassLosses = summary?.surfaceLosses?.Grass ?? (matches || []).filter((m) => String(m.loser_id) === String(playerId) && /grass/i.test(surf(m.surface))).length;

  const clayWR = (clayWins + clayLosses) > 0 ? Number(((clayWins / (clayWins + clayLosses)) * 100).toFixed(2)) : 0;
  const hardWR = (hardWins + hardLosses) > 0 ? Number(((hardWins / (hardWins + hardLosses)) * 100).toFixed(2)) : 0;
  const grassWR = (grassWins + grassLosses) > 0 ? Number(((grassWins / (grassWins + grassLosses)) * 100).toFixed(2)) : 0;

  const base = 'https://stats.tennismylife.org';
  const isOverview = !tab || tab === 'overview';
  const path = isOverview ? `/players/${encodeURIComponent(slug)}` : `/players/${encodeURIComponent(slug)}/${encodeURIComponent(tab as string)}`;
  const url = new URL(path, base).toString();
  // canonical (tab-independent) player @id used to avoid duplicate entities across tabs
  const personId = `${base}/players/${encodeURIComponent(slug)}#person`;

  // build JSON-LD as requested
  const nameForWiki = (atpname || name || '').replace(/\s+/g, '_');
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': 'Athlete',
    '@id': personId,
    name: atpname || name,
    url,
    mainEntityOfPage: url,
    description: `Complete statistics for ${name}: ATP results, matches in ${new Date().getFullYear()}, career records, ranking, titles, head-to-head records and surface performance. Updated to ${new Date().getFullYear()}.`,
    additionalProperty: [],
    sameAs: [
      `https://en.wikipedia.org/wiki/${encodeURIComponent(nameForWiki)}`,
      `https://www.atptour.com/en/players/${encodeURIComponent(slug)}/${String(playerId).toLowerCase()}/overview`,
    ],
    memberOf: { '@type': 'Organization', name: 'ATP Tour', url: 'https://www.atptour.com' },
  };

  // Optional rich fields
  if (birthdate) {
    // ensure birthdate is formatted YYYY-MM-DD if possible
    const d = new Date(birthdate);
    if (!isNaN(d.getTime())) ld.birthDate = d.toISOString().slice(0, 10);
  }
  if (birthplace) {
    ld.birthPlace = { '@type': 'Place', name: birthplace };
  }
  if (ioc) {
    const countryName = mapIocToCountry(ioc) ?? ioc;
    ld.nationality = { '@type': 'Country', name: countryName };
  }

  // add image using canonical OG image path
  const imageUrl = `${base}/og/${encodeURIComponent(slug)}.png`;
  ld.image = imageUrl;
  if (total > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Total Matches', value: total, unitText: 'matches' });
  }
  if (wins > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Career Wins', value: wins, unitText: 'matches' });
  }
  if (losses > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Career Losses', value: losses, unitText: 'matches' });
  }
  if (clayWR > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Clay Win %', value: clayWR, unitText: 'percent' });
  }
  if (hardWR > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Hard Win %', value: hardWR, unitText: 'percent' });
  }
  if (grassWR > 0) {
    ld.additionalProperty.push({ '@type': 'PropertyValue', name: 'Grass Win %', value: grassWR, unitText: 'percent' });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildDatasetLd({ name: atpname || name, slug, playerId, url, personId, wins, losses, total, hardWR, clayWR, grassWR, hardWins, hardLosses, clayWins, clayLosses, grassWins, grassLosses })) }} />
    </>
  );
}

function buildDatasetLd({
  name, slug, playerId, url, personId,
  wins, losses, total,
  hardWR, clayWR, grassWR,
  hardWins, hardLosses, clayWins, clayLosses, grassWins, grassLosses,
}: {
  name: string; slug: string; playerId: string | number; url: string; personId: string;
  wins: number; losses: number; total: number;
  hardWR: number; clayWR: number; grassWR: number;
  hardWins: number; hardLosses: number; clayWins: number; clayLosses: number; grassWins: number; grassLosses: number;
}) {
  const base = 'https://stats.tennismylife.org';
  const org = { '@type': 'Organization', name: 'TennisMyLife', url: base };

  const variableMeasured: any[] = [
    { '@type': 'PropertyValue', name: 'Career Matches Played', value: total },
    { '@type': 'PropertyValue', name: 'Career Wins', value: wins },
    { '@type': 'PropertyValue', name: 'Career Losses', value: losses },
  ];
  if (hardWins + hardLosses > 0) {
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Hard Court Wins', value: hardWins });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Hard Court Losses', value: hardLosses });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Hard Court Win Rate (%)', value: hardWR });
  }
  if (clayWins + clayLosses > 0) {
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Clay Court Wins', value: clayWins });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Clay Court Losses', value: clayLosses });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Clay Court Win Rate (%)', value: clayWR });
  }
  if (grassWins + grassLosses > 0) {
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Grass Court Wins', value: grassWins });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Grass Court Losses', value: grassLosses });
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Grass Court Win Rate (%)', value: grassWR });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${url}#dataset`,
    name: `${name} – ATP Tennis Statistics Dataset`,
    description: `Complete ATP match results and career statistics for ${name}: win-loss records, surface performance (hard, clay, grass), ranking history, tournament results and head-to-head data. Source: TennisMyLife.`,
    url,
    inLanguage: 'en-US',
    creator: org,
    publisher: org,
    about: { '@id': personId },
    keywords: [
      `${name} tennis statistics`,
      `${name} career stats`,
      `${name} win loss record`,
      `${name} surface stats`,
      `${name} ATP match results`,
      'ATP tennis data',
      'tennis statistics dataset',
    ],
    variableMeasured,
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/html',
        contentUrl: `${base}/players/${encodeURIComponent(slug)}/matches`,
        name: 'Match Results',
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/html',
        contentUrl: `${base}/players/${encodeURIComponent(slug)}/ranking`,
        name: 'Ranking History',
      },
    ],
    isAccessibleForFree: true,
    isPartOf: { '@type': 'WebSite', name: 'TennisMyLife', url: base },
    dateModified: new Date().toISOString(),
  };
}
