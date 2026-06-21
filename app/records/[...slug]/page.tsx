import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { shouldShowRecordFilter } from '../../../lib/records/allowed-filters';
import { Metadata } from 'next';
import { metadataBase } from '../../../lib/site';
import { getPlayerHref, getTourneyHref, createSlug } from '../../../lib/utils';
import { playerSurfaceHref, surfaceFromSelection } from '../nav';
import {
  evaluateRecordsPolicy,
  getRecordsPageTitle,
  getRecordsRobotsMeta,
  buildCanonicalQueryString,
  getWhitelistEntryByCanonicalPath,
  getCanonicalAliasEntryByCanonicalPath,
  type RecordFilters,
} from '../../../lib/seo/records-policy';
import { generateRecordDescription } from '../../../lib/generateRecordDescription';
import RecordsFilteredClient from './RecordsFilteredClient';
import SyncUrlClient from '../../../components/SyncUrlClient';
import RecordsItemListJsonLd from '../RecordsJsonLd';
import RecordsFaqJsonLd from '../RecordsFaqJsonLd';
import RecordsTabs from '../RecordsTabs';
import RecordsFilters from '../RecordsFilters.server';
import RelatedRecordsLinks from '../RelatedRecordsLinks';
import { resolveRecordHref } from '../record-links';

import AgesServer from '../Ages/Ages.server';
import AtAgeServer from '../AtAge/AtAge.server';
import AgeofNthServer from '../AgeofNth/AgeofNth.server';
import H2HServer from '../H2H/H2H.server';
import TimespanServer from '../Timespan/Timespan.server';
import SeasonsServer from '../Seasons/Seasons.server';
import SameServer from '../Same/Same.server';
import RoundsOnEntriesServer from '../RoundsOnEntries/RoundsOnEntries.server';
import WinsServer from '../Wins/Wins.server';
import TitlesServer from '../Titles/Titles.server';
import CounterSeasonsServer from '../CounterSeasons/CounterSeasons.server';
import CountServer from '../Count/Count.server';
import PlayedServer from '../Played/Played.server';
import EntriesServer from '../Entries/Entries.server';
import PercentageServer from '../Percentage/Percentage.server';
import NeededToServer from '../NeededTo/NeededTo.server';
import FirstNServer from '../FirstN/FirstN.server';
import StreakServer from '../Streak/Streak.server';

// ─── Label maps for breadcrumbs ─────────────────────────────────────────────
const RECORD_LABELS: Record<string, string> = {
  wins: 'Wins',
  played: 'Played',
  titles: 'Titles',
  entries: 'Entries',
  count: 'Rounds',
  rounds: 'Rounds',
  percentage: 'Win Percentage',
  ages: 'Ages',
  streak: 'Streak',
  timespan: 'Timespan',
  atage: 'At Age',
  ageofnth: 'Age at Nth',
  roundsonentries: 'Results by Appearances',
  same: 'Single Tournament',
  seasons: 'Single Season',
  neededto: 'Needed To',
  counterseasons: 'Counter Seasons',
  h2h: 'Head-to-Head',
  firstn: 'First N',
  sets: 'Sets',
};

const SUB_LABELS: Record<string, Record<string, string>> = {
  ages: {
    oldest: 'Oldest Main Draw',
    youngest: 'Youngest Main Draw',
    'oldest-winners': 'Oldest Title Winners',
    oldestWinners: 'Oldest Title Winners',
    'youngest-winners': 'Youngest Title Winners',
    youngestWinners: 'Youngest Title Winners',
  },
  timespan: { entries: 'Between Entries', titles: 'Between Titles', rounds: 'Between Finals' },
  roundsonentries: { titles: 'Titles per Entry', round: 'Round per Entry' },
  same: { wins: 'Wins', played: 'Played', entries: 'Entries', titles: 'Titles', round: 'Round' },
  seasons: { wins: 'Wins per Season', titles: 'Titles per Season', percentage: 'Win % per Season', round: 'Rounds per Season' },
  atage: { wins: 'Wins', titles: 'Titles', entries: 'Entries', round: 'Round', slams: 'Slams' },
  ageofnth: { wins: 'Nth Win Age', titles: 'Nth Title Age', slams: 'Nth Slam Age' },
  neededto: { titles: 'Titles' },
  counterseasons: { round: 'Rounds', wins: 'Wins', titles: 'Titles' },
  streak: { wins: 'Win Streak', round: 'Round Streak' },
  h2h: { count: 'H2H Count' },
};

type Props = {
  params: { slug?: string[] } | Promise<{ slug?: string[] }>;
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

function kebabToKey(s?: string) {
  if (!s) return s;
  if (s.includes('-')) {
    return s
      .split('-')
      .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
  }

  const suffixMap: Record<string, string> = { winners: 'Winners', maindraw: 'MainDraw' };
  const lower = s.toLowerCase();
  for (const [suffix, camel] of Object.entries(suffixMap)) {
    if (lower.endsWith(suffix)) {
      const prefix = s.slice(0, s.length - suffix.length);
      return prefix + camel;
    }
  }

  return s;
}

function camelToKebab(s?: string) {
  if (!s) return s;
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function normalizeSlugSegments(slug: string[]) {
  return slug.map((segment) => camelToKebab(segment) ?? segment);
}

function filtersToSearchParams(filters: RecordFilters): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (filters.level?.length) params.level = filters.level.map(v => v.toUpperCase());
  if (filters.surface?.length) params.surface = filters.surface.map(v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
  if (filters.round) params.round = filters.round.toUpperCase();
  if (filters.bestOf != null) params.bestOf = String(filters.bestOf);
  if (filters.subtab) params.subtab = filters.subtab.toLowerCase();
  return params;
}

function resolveAliasPath(slug: string[]) {
  if (!slug || slug.length === 0) return null;
  if (slug[0] === 'longest-winning-streak' || slug[0] === 'longest-win-streak') {
    return getWhitelistEntryByCanonicalPath('/records/longest-winning-streak') ?? null;
  }
  return getCanonicalAliasEntryByCanonicalPath(`/records/${slug.join('/')}`) ?? getWhitelistEntryByCanonicalPath(`/records/${slug.join('/')}`) ?? null;
}

// Forza il rendering dinamico su ogni richiesta: i searchParams (surface, level, round, bestOf)
// devono essere sempre freschi; senza questo Next.js potrebbe servire l'HTML pre-renderizzato
// al build-time anche per URL con filtri, ignorando i query params.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const tabs = [
    'wins','played','count','titles','entries','ages','timespan','percentage',
    'roundsonentries','same','seasons','atage','ageofnth','neededto',
    'counterseasons','h2h','streak'
  ];

  const subTabsMap: Record<string, string[]> = {
    ages: ['oldest','youngest','oldest-winners','youngest-winners'],
    timespan: ['entries','titles','rounds'],
    roundsonentries: ['titles','round'],
    same: ['wins','played','entries','titles','round'],
    seasons: ['wins','played','entries','titles','round','percentage'],
    atage: ['wins','played','entries','titles','slams','round'],
    ageofnth: ['wins','played','entries','titles','slams','round'],
    neededto: ['titles'],
    counterseasons: ['round','wins','titles'],
    streak: ['wins','round'],
    h2h: ['count'],
  };

  const params: { slug: string[] }[] = [];
  tabs.forEach(t => params.push({ slug: [t] }));
  Object.entries(subTabsMap).forEach(([k, arr]) => {
    arr.forEach(s => params.push({ slug: [k, s] }));
  });

  return params;
}

function resolveUrl(path: string) {
  try {
    return new URL(path, metadataBase).toString();
  } catch {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return new URL(path, base).toString();
  }
}

function canonicalizeParamsObj(sp: Record<string, any> | undefined) {
  if (!sp) return '';
  const map = new Map<string, string[]>();

  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;

    const normalizeVal = (val: string) => {
      if (k === 'level') return val.toUpperCase();
      if (k === 'surface') return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      if (k === 'round') return val.toUpperCase();
      if (k === 'subtab') return val.toLowerCase();
      return val;
    };

    const values = Array.isArray(v)
      ? v.map(String).map(normalizeVal)
      : [normalizeVal(String(v))];

    map.set(k, (map.get(k) ?? []).concat(values));
  }

  return Array.from(map.keys())
    .sort()
    .flatMap(k =>
      Array.from(new Set(map.get(k)!))
        .sort()
        .map(v => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    )
    .join('&');
}

function searchParamsToRecordFilters(sp: Record<string, string | string[] | undefined>): RecordFilters {
  return {
    level: Array.isArray(sp.level) ? sp.level.map(String) : sp.level ? [String(sp.level)] : undefined,
    surface: Array.isArray(sp.surface) ? sp.surface.map(String) : sp.surface ? [String(sp.surface)] : undefined,
    round: typeof sp.round === 'string' ? sp.round : undefined,
    bestOf: sp.bestOf !== undefined ? Number(Array.isArray(sp.bestOf) ? sp.bestOf[0] : sp.bestOf) : undefined,
  };
}

function buildPreservedParams(
  sp: Record<string, string | string[] | undefined>,
  excludedKeys: string[] = ['level', 'surface', 'round', 'bestOf', 'subtab'],
) {
  return Object.entries(sp)
    .filter(([k, v]) => !excludedKeys.includes(k) && v !== undefined)
    .flatMap(([k, v]) =>
      Array.isArray(v)
        ? v.map((val) => `${encodeURIComponent(k)}=${encodeURIComponent(String(val))}`)
        : [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`],
    )
    .join('&');
}

async function fetchRecordData(record: string | null, sub?: string | null) {
  if (!record) return [];
  const path = `/api/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}`;
  const url = resolveUrl(path);

  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data = await res.json();

    if (Array.isArray(data)) return data;

    if (data && typeof data === 'object') {
      const keys = ['topWinners','topPlayed','top','topTitles','topEntries','topRoundOnEntries','rows'];
      for (const k of keys) {
        if (Array.isArray((data as any)[k])) return (data as any)[k];
      }
      const arrProps = Object.values(data).filter(v => Array.isArray(v));
      if (arrProps.length) return arrProps[0] as any[];
    }

    return [];
  } catch {
    return [];
  }
}

function getRecordItemLabel(row: any) {
  const base =
    row?.name ??
    row?.player ??
    row?.winner_name ??
    row?.title ??
    row?.label ??
    row?.tourney_name ??
    row?.id;

  const metricKey =
    ['wins', 'entries', 'titles', 'matches', 'count', 'value', 'percentage', 'winPercentage'].find(
      (key) => row?.[key] !== undefined && row?.[key] !== null,
    ) ?? null;

  if (metricKey) {
    const metricValue = row?.[metricKey];
    const metricSuffix =
      metricKey === 'wins' ? 'wins' :
      metricKey === 'entries' ? 'entries' :
      metricKey === 'titles' ? 'titles' :
      metricKey === 'matches' ? 'matches' :
      metricKey === 'count' ? 'matches' :
      metricKey === 'percentage' || metricKey === 'winPercentage' ? 'percent' :
      metricKey;
    return `${String(base)} - ${String(metricValue)} ${metricSuffix}`;
  }

  return String(base);
}

function getRecordItemUrl(row: any, selectedSurface: string | null) {
  if (row?.url) return String(row.url);
  if (row?.href) return String(row.href);

  const slug = row?.slug ?? row?.player_slug ?? row?.playerId ?? row?.player_id ?? row?.winner_id ?? row?.id;
  if (!slug) return null;

  return playerSurfaceHref(String(slug), selectedSurface);
}

function buildItemListEntries(rows: any[], selectedSurface: string | null) {
  return rows.slice(0, 5).map((row, index) => ({
    name: getRecordItemLabel(row),
    url: getRecordItemUrl(row, selectedSurface),
    position: index + 1,
  })).filter((item): item is { name: string; url: string; position: number } => Boolean(item.url));
}

function buildFaqEntries(
  pageTitle: string,
  description: string,
  rows: any[],
  selectedSurfaces: Set<string>,
  selectedLevels: Set<string>,
  selectedRounds: string,
  selectedBestOf: number | null,
) {
  const stripSuffix = (s: string) => s.replace(/\s*\|\s*Tennis Records$/i, '').trim();
  const cleanTitle = stripSuffix(pageTitle);
  const firstRow = rows[0];
  const secondRow = rows[1];
  const topName =
    firstRow?.name ??
    firstRow?.player ??
    firstRow?.winner_name ??
    firstRow?.title ??
    firstRow?.label ??
    firstRow?.tourney_name ??
    'the current leader';
  const topValue =
    firstRow?.wins ??
    firstRow?.entries ??
    firstRow?.titles ??
    firstRow?.matches ??
    firstRow?.count ??
    firstRow?.value ??
    firstRow?.percentage ??
    firstRow?.winPercentage ??
    null;

  const activeFilters = [
    selectedSurfaces.size ? `surface ${Array.from(selectedSurfaces).join(', ')}` : null,
    selectedLevels.size ? `level ${Array.from(selectedLevels).join(', ')}` : null,
    selectedRounds ? `round ${selectedRounds}` : null,
    selectedBestOf != null ? `best of ${selectedBestOf}` : null,
  ].filter(Boolean);

  const filterText = activeFilters.length
    ? `The current page applies ${activeFilters.join(', ')} filters.`
    : 'This page is showing the unfiltered ranking.';

  const topValueText = topValue != null ? ` It is currently led by ${topName} with ${topValue}.` : ` The current leader is ${topName}.`;
  const runnerUpName =
    secondRow?.name ??
    secondRow?.player ??
    secondRow?.winner_name ??
    secondRow?.title ??
    secondRow?.label ??
    secondRow?.tourney_name ??
    null;
  const runnerUpValue =
    secondRow?.wins ??
    secondRow?.entries ??
    secondRow?.titles ??
    secondRow?.matches ??
    secondRow?.count ??
    secondRow?.value ??
    secondRow?.percentage ??
    secondRow?.winPercentage ??
    null;

  return [
    {
      question: `Why does ${cleanTitle} matter?`,
      answer: description || `${cleanTitle} tracks this ATP record ranking.`,
    },
    {
      question: `Who leads ${cleanTitle} right now?`,
      answer: `${cleanTitle} is currently led by ${topName}.${topValueText}`,
    },
    {
      question: `What is the closest chase on ${cleanTitle}?`,
      answer: runnerUpName
        ? `${runnerUpName} is the current nearest challenger${runnerUpValue != null ? `, with ${runnerUpValue}` : ''}. ${filterText}`
        : filterText,
    },
  ];
}

export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const slug = p.slug ?? [];
  if (slug[0] === 'seasons' && slug[1] === 'entries') {
    redirect('/records/most-tournament-appearances-in-single-season');
  }
  if (slug[0] === 'streak' && slug[1] === 'wins' && !canonicalizeParamsObj(sp)) {
    redirect('/records/longest-winning-streak');
  }
  if (slug[0] === 'longest-win-streak') {
    const query = canonicalizeParamsObj(sp);
    redirect(`/records/longest-winning-streak${query ? `?${query}` : ''}`);
  }
  const aliasEntry = resolveAliasPath(slug);
  const effectiveSearchParams = aliasEntry
    ? { ...sp, ...filtersToSearchParams(aliasEntry.filters) }
    : sp;
  const record = aliasEntry ? aliasEntry.slug[0] : (slug[0] === 'rounds' ? 'count' : slug[0] ?? null);
  const displayRecord = (record === 'count' || slug[0] === 'rounds') ? 'rounds' : record;
  const sub = aliasEntry ? aliasEntry.slug[1] ?? null : slug[1] ?? null;

  const toArray = (v?: string | string[]) => v === undefined ? [] : Array.isArray(v) ? v : [v];

  const selectedSurfaces = new Set(toArray(effectiveSearchParams.surface ?? effectiveSearchParams['surface[]']).map(
    s => typeof s === 'string'
      ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      : s
  ));
  const selectedLevels = new Set(toArray(effectiveSearchParams.level ?? effectiveSearchParams['level[]']));
  const selectedRounds = typeof effectiveSearchParams.round === 'string' ? effectiveSearchParams.round : '';
  const selectedBestOf = effectiveSearchParams.bestOf ? Number(effectiveSearchParams.bestOf) : null;

  const topParam = (() => {
    const v = sp.top;
    const parsed = v !== undefined ? Number(Array.isArray(v) ? v[0] : v) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  })();

  const activeSubTabsDefault: Record<string,string> = {
    ages: 'oldest',
    timespan: 'entries',
    roundsonentries: 'titles',
    same: 'wins',
    seasons: 'wins',
    atage: 'wins',
    ageofnth: 'wins',
    neededto: 'titles',
    counterseasons: 'round',
    streak: 'wins',
    h2h: 'count',
  };

  const nParam = (() => {
    const v = (sp.n ?? sp.seasons);
    const parsed = v !== undefined ? Number(Array.isArray(v) ? v[0] : v) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  })();

  // Use the subtab from URL if present, otherwise use default
  const activeSubResolved = sub ? kebabToKey(sub) : (typeof effectiveSearchParams.subtab === 'string' ? kebabToKey(effectiveSearchParams.subtab) : undefined);
  const activeSubTabsWithUrl = record && activeSubResolved 
    ? { ...activeSubTabsDefault, [record]: activeSubResolved }
    : activeSubTabsDefault;

  const desc = aliasEntry?.title ?? generateRecordDescription(
    record,
    activeSubTabsWithUrl,
    selectedSurfaces,
    selectedLevels,
    selectedRounds,
    selectedBestOf,
    { n: nParam, top: topParam }
  );

  // ── SEO policy ────────────────────────────────────────────────────────────
  const filtersMeta: RecordFilters = {
    ...(selectedLevels.size ? { level: Array.from(selectedLevels) } : {}),
    ...(selectedSurfaces.size ? { surface: Array.from(selectedSurfaces) } : {}),
    ...(selectedRounds ? { round: selectedRounds } : {}),
    ...(selectedBestOf != null ? { bestOf: selectedBestOf } : {}),
  };
  const policySlug = record ? ((sub ?? activeSubResolved) ? [record, (sub ?? activeSubResolved)!] : [record]) : [];
  const policy = evaluateRecordsPolicy(metadataBase.origin, policySlug, filtersMeta);
  const pageTitle = getRecordsPageTitle(policySlug, filtersMeta, desc);
  const robotsMeta = getRecordsRobotsMeta(policy);

  return {
    title: { absolute: pageTitle },
    description: desc || 'TML records and statistics',
    openGraph: {
      title: pageTitle,
      description: desc || 'TML records and statistics',
      images: [new URL('/og/site-preview.png', metadataBase).toString()],
      url: policy.canonical,
      siteName: 'TennisMyLife',
    },
    twitter: {
      title: pageTitle,
      description: desc || 'TML records and statistics',
      images: [new URL('/og/site-preview.png', metadataBase).toString()],
    },
    alternates: { canonical: policy.canonical },
    robots: robotsMeta,
  };                                        
}

export default async function SlugPage({ params, searchParams }: Props) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const slug = p.slug ?? [];
  const aliasEntry = resolveAliasPath(slug);
  const effectiveSearchParams = aliasEntry
    ? { ...sp, ...filtersToSearchParams(aliasEntry.filters) }
    : sp;
  const rawRecord = aliasEntry ? aliasEntry.slug[0] : slug[0] ?? null;
  const record = rawRecord === 'rounds' ? 'count' : rawRecord;
  const displayRecord = (record === 'count' || slug[0] === 'rounds') ? 'rounds' : record;
  const sub = aliasEntry ? aliasEntry.slug[1] ?? null : (slug[1] ? kebabToKey(slug[1]) : null);
  const currentPath = aliasEntry?.canonicalPath ?? `/records/${slug.map((segment) => encodeURIComponent(segment)).join('/')}`;
  const normalizedSlug = record ? [record, ...normalizeSlugSegments(slug.slice(1))] : [];
  const navigationSlug = aliasEntry ? aliasEntry.slug : normalizedSlug;
  const filtersForNavigation = searchParamsToRecordFilters(effectiveSearchParams);

  // Debug logging
  console.log('[SlugPage] slug:', slug, 'aliasEntry:', aliasEntry, 'record:', record, 'sub:', sub, 'effectiveSearchParams:', effectiveSearchParams);

  // Redirect whitelist-based /records query URLs to their canonical path-based alias.
  if (record) {
    // Use normalized record (first segment) so 'rounds' → 'count' resolves to the correct alias.
    const resolvedPath = resolveRecordHref(navigationSlug, filtersForNavigation);
    const preservedParams = buildPreservedParams(sp);
    const resolvedUrl = `${resolvedPath}${preservedParams ? `${resolvedPath.includes('?') ? '&' : '?'}${preservedParams}` : ''}`;
    const currentPath = `/records/${normalizeSlugSegments(slug).join('/')}`;
    const currentQuery = canonicalizeParamsObj(sp);
    const targetQuery = canonicalizeParamsObj(
      Object.fromEntries(new URLSearchParams(resolvedUrl.split('?')[1] ?? '').entries()),
    );
    // Extract just the path portion from resolvedPath for comparison (resolvedPath includes query string)
    const resolvedPathOnly = resolvedPath.split('?')[0];
    // Prevent redirect loop: only redirect if resolved URL is different from current URL
    if (resolvedPathOnly !== currentPath || currentQuery !== targetQuery) {
      // Additional safeguard: don't redirect if the resolved URL is the same as current
      const currentFullUrl = `${currentPath}${currentQuery ? `?${currentQuery}` : ''}`;
      if (resolvedUrl !== currentFullUrl) {
        redirect(resolvedUrl);
      }
    }
  }

  const hasQueryParams = Object.keys(sp || {}).length > 0;

  // Redirect streak/round to default round=F if no round param is set.
  // Skip when aliasEntry already supplies the round filter (e.g. /records/longest-streak-of-consecutive-finals).
  if (!aliasEntry && record === 'streak' && (sub === 'round') && !sp.round) {
    const otherParams = buildPreservedParams(sp, ['round']);
    const qs = otherParams ? `round=F&${otherParams}` : 'round=F';
    redirect(`/records/streak/round?${qs}`);
  }

  // Redirect roundsonentries/round to default round=F if no round param is set.
  if (!aliasEntry && record === 'roundsonentries' && sub === 'round' && !sp.round) {
    const otherParams = buildPreservedParams(sp, ['round']);
    const qs = otherParams ? `round=F&${otherParams}` : 'round=F';
    redirect(`/records/roundsonentries/round?${qs}`);
  }

  // Redirect /records/rounds (no round param) to /records/rounds?round=F.
  if (!aliasEntry && rawRecord === 'rounds' && !sp.round) {
    const otherParams = buildPreservedParams(sp, ['round']);
    const qs = otherParams ? `round=F&${otherParams}` : 'round=F';
    redirect(`/records/rounds?${qs}`);
  }

  // Redirect same/round to default round=F if no round param is set.
  if (!aliasEntry && record === 'same' && sub === 'round' && !sp.round) {
    const otherParams = buildPreservedParams(sp, ['round']);
    const qs = otherParams ? `round=F&${otherParams}` : 'round=F';
    redirect(`/records/same/round?${qs}`);
  }

  // Redirect seasons/round to default round=F if no round param is set.
  if (!aliasEntry && record === 'seasons' && sub === 'round' && !sp.round) {
    const otherParams = buildPreservedParams(sp, ['round']);
    const qs = otherParams ? `round=F&${otherParams}` : 'round=F';
    redirect(`/records/seasons/round?${qs}`);
  }

  const activeSubTabsDefault: Record<string,string> = {
    ages: 'oldest',
    timespan: 'entries',
    roundsonentries: 'titles',
    same: 'wins',
    seasons: 'wins',
    atage: 'wins',
    ageofnth: 'wins',
    neededto: 'titles',
    counterseasons: 'round',
    streak: 'wins',
    h2h: 'count',
  };

  if (!aliasEntry && slug[0] === 'streak' && slug[1] === 'wins' && !canonicalizeParamsObj(sp)) {
    redirect('/records/longest-winning-streak');
  }

  // Records that have subtabs must not be navigable at the root level — redirect to the default subtab
  if (record && record in activeSubTabsDefault && !sub && typeof sp.subtab !== 'string') {
    redirect(`/records/${record}/${activeSubTabsDefault[record]}`);
  }

  // ── Invalid filter combination → 404 ─────────────────────────────────────
  // If a filter param is present in the URL but that filter doesn't apply to
  // this record/sub, the combination doesn't exist → return 404.
  if (record) {
    const toArr = (v?: string | string[]) => v === undefined ? [] : Array.isArray(v) ? v : [v];
    const effectiveSubForValidation = sub ?? (typeof effectiveSearchParams.subtab === 'string' ? kebabToKey(effectiveSearchParams.subtab) : undefined);

    const hasLevel   = toArr(effectiveSearchParams.level   ?? effectiveSearchParams['level[]']).filter(Boolean).length > 0;
    const hasSurface = toArr(effectiveSearchParams.surface ?? effectiveSearchParams['surface[]']).filter(Boolean).length > 0;
    const hasRound   = typeof effectiveSearchParams.round  === 'string' && effectiveSearchParams.round  !== '';
    const hasBestOf  = typeof effectiveSearchParams.bestOf === 'string' && effectiveSearchParams.bestOf !== '';

    if (
      (hasLevel   && !shouldShowRecordFilter('levels',   record, effectiveSubForValidation)) ||
      (hasSurface && !shouldShowRecordFilter('surfaces', record, effectiveSubForValidation)) ||
      (hasRound   && !shouldShowRecordFilter('rounds',   record, effectiveSubForValidation)) ||
      (hasBestOf  && !shouldShowRecordFilter('bestOf',   record, effectiveSubForValidation))
    ) {
      notFound();
    }
  }

  if (!hasQueryParams && !record) {
    const data = await fetchRecordData(record, sub);

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <React.Suspense fallback={<div className="text-gray-300">Loading…</div>}>
          <section className="mb-6 text-gray-200">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">
              {record ? `${record.toUpperCase()} Records` : 'Records'}
            </h2>
            <p className="text-gray-300">
              {record ? `Record page for ${record}${sub ? ` / ${sub}` : ''}` : 'All records'}
            </p>
          </section>

          <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
            {data && data.length > 0 ? (
              <table className="w-full table-auto text-center text-sm">
                <thead>
                  <tr className="text-gray-300">
                    {Object.keys(data[0]).map(k => (
                      <th key={k} className="px-2 py-1 font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-2 py-1 text-gray-200">{String(v ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-400">No data available</div>
            )}
          </section>
        </React.Suspense>
      </main>
    );
  }

  const serverMap: Record<string, any> = {
    ages: AgesServer,
    atage: AtAgeServer,
    ageofnth: AgeofNthServer,
    h2h: H2HServer,
    timespan: TimespanServer,
    seasons: SeasonsServer,
    same: SameServer,
    roundsonentries: RoundsOnEntriesServer,
    wins: WinsServer,
    titles: TitlesServer,
    counterseasons: CounterSeasonsServer,
    count: CountServer,
    rounds: CountServer,
    played: PlayedServer,
    entries: EntriesServer,
    percentage: PercentageServer,
    neededto: NeededToServer,
    firstn: FirstNServer,
    streak: StreakServer,
  };

  const ServerComponent = record ? serverMap[record] : null;

  if (ServerComponent) {
    const toArray = (v?: string | string[]) => v === undefined ? [] : Array.isArray(v) ? v : [v];

    const selectedSurfaces = new Set(toArray(effectiveSearchParams.surface ?? effectiveSearchParams['surface[]']));
    const selectedLevels = new Set(toArray(effectiveSearchParams.level ?? effectiveSearchParams['level[]']));
    const selectedRounds = typeof effectiveSearchParams.round === 'string' ? effectiveSearchParams.round : '';
    const selectedBestOf = effectiveSearchParams.bestOf ? Number(effectiveSearchParams.bestOf) : null;
    const activeSubResolved = sub ?? (typeof effectiveSearchParams.subtab === 'string' ? kebabToKey(effectiveSearchParams.subtab) : undefined);

    // Default the displayed round to Finals (F) when visiting CounterSeasons → round or Streak → round without explicit round param
    const selectedRoundsForDesc =
      ((record === 'counterseasons' || record === 'streak') && (activeSubResolved === 'round' || sub === 'round'))
        ? (selectedRounds || 'F')
        : selectedRounds;

    const nParam = (() => {
      const v = (effectiveSearchParams.n ?? effectiveSearchParams.seasons);
      const parsed = v !== undefined ? Number(Array.isArray(v) ? v[0] : v) : undefined;
      return Number.isFinite(parsed) ? parsed : undefined;
    })();

    const topParam = (() => {
      const v = effectiveSearchParams.top;
      const parsed = v !== undefined ? Number(Array.isArray(v) ? v[0] : v) : undefined;
      return Number.isFinite(parsed) ? parsed : undefined;
    })();

    const description = aliasEntry?.title ?? generateRecordDescription(
      record,
      { ...activeSubTabsDefault, [record || '']: activeSubResolved || activeSubTabsDefault[record || ''] },
      selectedSurfaces,
      selectedLevels,
      selectedRoundsForDesc,
      selectedBestOf,
      { n: nParam, top: topParam }
    );

    // ── SEO policy (render path) ──────────────────────────────────────────
    const filtersForPolicy: RecordFilters = {
      ...(selectedLevels.size ? { level: Array.from(selectedLevels) } : {}),
      ...(selectedSurfaces.size ? { surface: Array.from(selectedSurfaces) } : {}),
      ...(selectedRounds ? { round: selectedRounds } : {}),
      ...(selectedBestOf != null ? { bestOf: selectedBestOf } : {}),
    };
    const policySlugRender = (sub ?? activeSubResolved) ? [record, (sub ?? activeSubResolved)!] : [record];
    const renderPolicy = evaluateRecordsPolicy(metadataBase.origin, policySlugRender, filtersForPolicy);
    const canonicalFull = renderPolicy.canonical;

    const subLabelResolved = record && activeSubResolved
      ? (SUB_LABELS[record]?.[activeSubResolved] ?? SUB_LABELS[record]?.[kebabToKey(activeSubResolved) ?? ''] ?? activeSubResolved)
      : null;

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', metadataBase).toString() },
        { '@type': 'ListItem', position: 2, name: 'Records', item: new URL('/records', metadataBase).toString() },
        ...(record
          ? [{ '@type': 'ListItem', position: 3, name: (activeSubResolved ? subLabelResolved ?? activeSubResolved : RECORD_LABELS[record] ?? record), item: new URL(canonicalFull, metadataBase).toString() }]
          : []),
      ],
    };

    const webPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: getRecordsPageTitle(policySlugRender, filtersForPolicy, description),
      description: description || 'TML records and statistics',
      url: canonicalFull,
      inLanguage: 'en-US',
      isPartOf: {
        '@type': 'WebSite',
        name: 'TennisMyLife',
        url: metadataBase.toString(),
      },
      publisher: {
        '@type': 'Organization',
        name: 'TennisMyLife',
        url: metadataBase.toString(),
      },
      dateModified: new Date().toISOString(),
    };

    const pageTitle = getRecordsPageTitle(policySlugRender, filtersForPolicy, description);

    const tableRows = await fetchRecordData(record, sub);
    const itemListEntries = buildItemListEntries(tableRows, surfaceFromSelection(selectedSurfaces));

    const faqEntries = buildFaqEntries(
      pageTitle,
      description || '',
      tableRows,
      selectedSurfaces,
      selectedLevels,
      selectedRounds,
      selectedBestOf,
    );

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <RecordsItemListJsonLd
          name="Top 5 records"
          description="The first five rows shown in the current records table."
          items={itemListEntries}
        />
        <RecordsFaqJsonLd items={faqEntries} />
        <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-gray-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden="true" className="mx-1 text-gray-600">/</span>
            <Link href="/records" className="hover:text-white transition-colors">Records</Link>
            {record && (
              <>
                <span aria-hidden="true" className="mx-1 text-gray-600">/</span>
                <span className="text-white" aria-current="page">
                  {activeSubResolved ? (subLabelResolved ?? activeSubResolved) : (RECORD_LABELS[displayRecord] ?? displayRecord)}
                </span>
              </>
            )}
          </nav>
          <SyncUrlClient url={canonicalFull} />
          {(() => {
            const h1 = getRecordsPageTitle(
              policySlugRender,
              filtersForPolicy,
              description,
            ).replace(/ \| TennisMyLife$/, '').replace(/ \| Tennis Records$/, '');
            const HeadingTag = record === 'h2h' ? 'h2' : 'h1';
            return h1 ? (
              <HeadingTag className="mb-10 text-center text-3xl sm:text-4xl font-semibold text-white">
                {h1}
              </HeadingTag>
            ) : null;
          })()}
          <RecordsTabs activeTab={displayRecord} activeSubTab={activeSubResolved || null} />
          <RecordsFilters
            activeTab={record}
            activeSubTab={activeSubResolved || null}
            currentPath={currentPath}
            searchParams={effectiveSearchParams}
          />
          <ServerComponent searchParams={effectiveSearchParams} record={record} sub={activeSubResolved} canonicalUrl={canonicalFull} description={description} currentPath={currentPath} />
          <RelatedRecordsLinks
            currentTab={record}
            currentSub={activeSubResolved || null}
            filters={{
              level: selectedLevels.size ? Array.from(selectedLevels) : undefined,
              surface: selectedSurfaces.size ? Array.from(selectedSurfaces) : undefined,
              round: selectedRounds || undefined,
              bestOf: selectedBestOf,
            }}
          />
        </main>
      </>
    );
  }

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <RecordsFilteredClient
        record={record}
        sub={sub}
        filters={sp}
        canonicalUrl={resolveUrl(`/records/${record ?? ''}`)}
      />
    </main>
  );
}
