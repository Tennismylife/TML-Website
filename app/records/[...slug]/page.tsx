import React from 'react';
import { Metadata } from 'next';
import { metadataBase } from '../../../lib/site';
import { generateRecordDescription } from '../../../lib/generateRecordDescription';
import RecordsFilteredClient from './RecordsFilteredClient';
import SyncUrlClient from '../../../components/SyncUrlClient';
import RecordsTabs from '../RecordsTabs';
import RecordsFilters from '../RecordsFilters.server';

import AgesServer from '../Ages/Ages.server';
import AtAgeServer from '../AtAge/AtAge.server';
import AgeofNthServer from '../AgeofNth/AgeofNth.server';
import H2HServer from '../H2H/H2H.server';
import TimespanServer from '../Timespan/Timespan.server';
import SeasonsServer from '../Seasons/Seasons.server';
import SameServer from '../Same/Same.server';
import RoundsOnEntriesServer from '../RoundsOnEntries/RoundsOnEntries.server';
import SetsServer from '../Sets/Sets.server';
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

export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const slug = p.slug ?? [];
  const record = slug[0] ?? null;
  const sub = slug[1] ?? null;

  const toArray = (v?: string | string[]) => v === undefined ? [] : Array.isArray(v) ? v : [v];

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']).map(
    s => typeof s === 'string'
      ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      : s
  ));
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']));
  const selectedRounds = typeof sp.round === 'string' ? sp.round : '';
  const selectedBestOf = sp.bestOf ? Number(sp.bestOf) : null;

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
  const activeSubResolved = sub ? kebabToKey(sub) : (typeof sp.subtab === 'string' ? kebabToKey(sp.subtab) : undefined);
  const activeSubTabsWithUrl = record && activeSubResolved 
    ? { ...activeSubTabsDefault, [record]: activeSubResolved }
    : activeSubTabsDefault;

  const desc = generateRecordDescription(
    record,
    activeSubTabsWithUrl,
    selectedSurfaces,
    selectedLevels,
    selectedRounds,
    selectedBestOf,
    { n: nParam }
  );

  const canonicalPath = record
    ? `/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}`
    : '/records';

  const canonicalParams: Record<string, any> = {};
  ['surface','level','round','bestOf'].forEach(k => {
    const v = sp[k] ?? sp[`${k}[]`];
    if (v !== undefined) canonicalParams[k] = v;
  });

  const query = canonicalizeParamsObj(canonicalParams);
  const canonicalFull = resolveUrl(canonicalPath) + (query ? `?${query}` : '');

  const isPrincipalCombination =
    selectedSurfaces.size === 1 &&
    selectedSurfaces.has('Hard') &&
    selectedLevels.size === 0 &&
    !selectedRounds &&
    selectedBestOf === null;

  // All records pages are indexable regardless of filters.

  return {
    title: {
      absolute: `${desc || record || 'Records'} | Tennis Records`,
    },
    description: desc || 'TML records and statistics',
    openGraph: {
      title: `${desc || record || 'Records'} | Tennis Records`,
      description: desc || 'TML records and statistics',
      images: [new URL('/og/site-preview.png', metadataBase).toString()],
      url: canonicalFull,
      siteName: 'TennisMyLife',
    },
    twitter: {
      title: `${desc || record || 'Records'} | Tennis Records`,
      description: desc || 'TML records and statistics',
      images: [new URL('/og/site-preview.png', metadataBase).toString()],
    },
    alternates: { canonical: canonicalFull },
    robots: { index: true, follow: true },
  };                                        
}

export default async function SlugPage({ params, searchParams }: Props) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const slug = p.slug ?? [];
  const record = slug[0] ?? null;
  const sub = slug[1] ? kebabToKey(slug[1]) : null;

  const hasQueryParams = Object.keys(sp || {}).length > 0;

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
              <table className="w-full table-auto text-left text-sm">
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
    sets: SetsServer,
    wins: WinsServer,
    titles: TitlesServer,
    counterseasons: CounterSeasonsServer,
    count: CountServer,
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

    const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']));
    const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']));
    const selectedRounds = typeof sp.round === 'string' ? sp.round : '';
    const selectedBestOf = sp.bestOf ? Number(sp.bestOf) : null;
    const activeSubResolved = sub ?? (typeof sp.subtab === 'string' ? kebabToKey(sp.subtab) : undefined);

    // Default the displayed round to Finals (F) when visiting CounterSeasons → round without explicit round param
    const selectedRoundsForDesc = (record === 'counterseasons' && (activeSubResolved === 'round' || sub === 'round')) ? (selectedRounds || 'F') : selectedRounds;

    const nParam = (() => {
      const v = (sp.n ?? sp.seasons);
      const parsed = v !== undefined ? Number(Array.isArray(v) ? v[0] : v) : undefined;
      return Number.isFinite(parsed) ? parsed : undefined;
    })();

    const description = generateRecordDescription(
      record,
      { ...activeSubTabsDefault, [record || '']: activeSubResolved || activeSubTabsDefault[record || ''] },
      selectedSurfaces,
      selectedLevels,
      selectedRoundsForDesc,
      selectedBestOf,
      { n: nParam }
    );

    const canonicalUrl = resolveUrl(`/records/${record}${sub ? `/${sub}` : ''}`);
    const query = canonicalizeParamsObj(sp);
    const canonicalFull = canonicalUrl + (query ? `?${query}` : '');

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <React.Suspense fallback={<div className="text-gray-300">Loading…</div>}>
          <SyncUrlClient url={canonicalFull} />
          {description && (
            <h1 className="mb-10 text-center text-3xl sm:text-4xl font-semibold text-white">
              {description}
            </h1>
          )}
          <RecordsTabs activeTab={record} activeSubTab={activeSubResolved || null} />
          <RecordsFilters activeTab={record} activeSubTab={activeSubResolved || null} searchParams={sp} />
          <ServerComponent searchParams={sp} record={record} sub={activeSubResolved} canonicalUrl={canonicalFull} description={description} />
        </React.Suspense>
      </main>
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
