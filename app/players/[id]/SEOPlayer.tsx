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
  matches: MatchLite[]; // match già passati dal PlayerPage
}

export default function SEOPlayer({ playerId, slug, name, atpname, tab = 'overview', birthdate, ioc, birthplace, matches }: SEOPlayerProps) {
  // filtered: escludi match con status === false
  const filtered = (matches || []).filter((m) => m?.status !== false);
  const total = filtered.length;
  const wins = filtered.filter((m) => String(m.winner_id) === String(playerId)).length;
  const losses = total - wins;

  const surf = (s?: string | null) => (s || '').toLowerCase();
  const clayWins = filtered.filter((m) => String(m.winner_id) === String(playerId) && /clay/i.test(surf(m.surface))).length;
  const hardWins = filtered.filter((m) => String(m.winner_id) === String(playerId) && /hard/i.test(surf(m.surface))).length;
  const grassWins = filtered.filter((m) => String(m.winner_id) === String(playerId) && /grass/i.test(surf(m.surface))).length;

  const clayLosses = filtered.filter((m) => String(m.loser_id) === String(playerId) && /clay/i.test(surf(m.surface))).length;
  const hardLosses = filtered.filter((m) => String(m.loser_id) === String(playerId) && /hard/i.test(surf(m.surface))).length;
  const grassLosses = filtered.filter((m) => String(m.loser_id) === String(playerId) && /grass/i.test(surf(m.surface))).length;

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
    '@type': 'Person',
    '@id': personId,
    name: atpname || name,
    url,
    mainEntityOfPage: url,
    description: `Statistiche, risultati e record ATP di ${name}.`,
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
  );
}
