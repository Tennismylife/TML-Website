import { Metadata } from 'next';
import { metadataBase } from '../../../lib/site';
import { generateRecordDescription } from '../../../lib/generateRecordDescription';
import { keyFromParamLabel } from '../../../lib/levels';
import RecordsFilteredClient from './RecordsFilteredClient';
import SyncUrlClient from '../../../components/SyncUrlClient';
import RecordsTabs from '../RecordsTabs';
import RecordsFilters from '../RecordsFilters.server';

// Server-side wrappers for each record section
import AgesServer from '../Ages/Ages.server'
import AtAgeServer from '../AtAge/AtAge.server'
import AgeofNthServer from '../AgeofNth/AgeofNth.server'
import H2HServer from '../H2H/H2H.server'
import TimespanServer from '../Timespan/Timespan.server'
import SeasonsServer from '../Seasons/Seasons.server'
import SameServer from '../Same/Same.server'
import RoundsOnEntriesServer from '../RoundsOnEntries/RoundsOnEntries.server'
import SetsServer from '../Sets/Sets.server'
import WinsServer from '../Wins/Wins.server'
import TitlesServer from '../Titles/Titles.server'
import CounterSeasonsServer from '../CounterSeasons/CounterSeasons.server'
import CountServer from '../Count/Count.server'
import PlayedServer from '../Played/Played.server'
import EntriesServer from '../Entries/Entries.server'
import PercentageServer from '../Percentage/Percentage.server'
import NeededToServer from '../NeededTo/NeededTo.server'
import FirstNServer from '../FirstN/FirstN.server'
import StreakServer from '../Streak/Streak.server'

type Params = { slug?: string[] };
type SearchParams = Record<string, string | string[] | undefined>;

function kebabToKey(s: string | undefined) {
  if (!s) return s;
  return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
}

export async function generateStaticParams() {
  const tabs = [
    'wins','played','count','titles','entries','ages','timespan','percentage','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'
  ];

  const subTabsMap: Record<string,string[]> = {
    ages: ['oldest','youngest','oldest-winners','youngest-winners'],
    timespan: ['entries','titles','rounds'],
    roundsonentries: ['titles','round'],
    same: ['wins','played','entries','titles','round'],
    seasons: ['wins','played','entries','titles','round','percentage'],
    atage: ['wins','played','entries','titles','slams','round'],
    ageofnth: ['wins','played','entries','titles','slams','round'],
    neededto: ['titles'],
    counterseasons: ['round','titles'],
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

// Helper to resolve URL against metadataBase with safe fallback
function resolveUrl(path: string) {
  try {
    return new URL(path, metadataBase).toString();
  } catch (e) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return new URL(path, base).toString();
  }
}

// Canonicalize arbitrary search params object into a deterministic query string
function canonicalizeParamsObj(sp: Record<string, any> | undefined) {
  if (!sp) return '';
  const map = new Map<string, string[]>();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    const key = k;
    const normalizeVal = (val: string) => {
      // For `level`, canonicalize to single-letter uppercase (e.g. G)
      if (key === 'level') return String(val).toUpperCase();
      if (key === 'surface') return String(val).charAt(0).toUpperCase() + String(val).slice(1).toLowerCase();
      if (key === 'round') return String(val).toUpperCase();
      if (key === 'subtab') return String(val).toLowerCase();
      return val;
    };
    const values = Array.isArray(v) ? v.map(String).map(normalizeVal) : [normalizeVal(String(v))];
    if (!map.has(key)) map.set(key, []);
    map.set(key, map.get(key)!.concat(values));
  }
  const keys = Array.from(map.keys()).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const vals = Array.from(new Set(map.get(k)!)).sort();
    for (const v of vals) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

export async function fetchRecordData(record: string | null, sub?: string | null) {
  if (!record) return [] as any[];
  const path = `/api/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}`;
  const url = resolveUrl(path);
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [] as any[];
    const data = await res.json();

    // Accept either an array or known object shapes returned by record APIs
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Common keys used by records endpoints
      const keys = ['topWinners', 'topPlayed', 'top', 'topTitles', 'topEntries', 'topRoundOnEntries', 'rows'];
      for (const k of keys) {
        if (Array.isArray((data as any)[k])) return (data as any)[k];
      }

      // Fallback: if the object contains a single array property, return it
      const arrProps = Object.values(data).filter((v) => Array.isArray(v));
      if (arrProps.length) return arrProps[0] as any[];
    }

    return [] as any[];
  } catch (err) {
    return [] as any[];
  }
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams; }): Promise<Metadata> {
  // `params` can be thenable in App Router; await it before accessing properties
  const p = (params && typeof (params as any)?.then === 'function') ? await (params as any) : (params || {});
  const slug = p.slug || [];
  const record = slug[0] ?? null;
  const sub = slug[1] ?? null;

  // Resolve searchParams early so metadata can reflect filters (e.g. surface=Clay)
  const sp = (searchParams && typeof (searchParams as any)?.then === 'function') ? await (searchParams as any) : (searchParams || {});
  const hasQueryParams = Object.keys(sp || {}).length > 0;
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
  // Normalize surfaces to Title Case for display/highlighting
  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']).map(s => typeof s === 'string' ? (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) : s));
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']));
  const selectedRounds = typeof sp.round === 'string' ? String(sp.round) : '';
  const selectedBestOf = sp.bestOf ? Number(sp.bestOf as string) : null;

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

  const titleBase = record ? `${record}${sub ? ' — ' + sub : ''}` : 'Records';
  const desc = generateRecordDescription(record, activeSubTabsDefault, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);

  const canonicalPath = record ? `/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}` : '/records';
  const canonicalUrl = resolveUrl(canonicalPath);

  return {
    title: `${desc || titleBase} — TML`,
    description: desc || 'TML records and statistics',
    alternates: { canonical: canonicalUrl },
    robots: hasQueryParams ? { index: false, follow: true } : { index: true, follow: true },
  } as Metadata;
}

export default async function SlugPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  // Resolve `params` (may be thenable) before accessing `slug`
  const p = (params && typeof (params as any)?.then === 'function') ? await (params as any) : (params || {});
  const slug = p.slug || [];
  const record = slug[0] ?? null;
  const sub = slug[1] ? kebabToKey(slug[1]) : null;
  // Resolve searchParams (it may be thenable) before reading its properties
  const spResolved = (searchParams && typeof (searchParams as any)?.then === 'function') ? await (searchParams as any) : (searchParams || {});
  const hasQueryParams = Object.keys(spResolved || {}).length > 0;

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

  // If there are no query params and no specific record, render the generic record table.
  // If a `record` is present, prefer server-rendering the dedicated ServerComponent so
  // record pages are SSR even without query params.
  if (!hasQueryParams && !record) {
    const data = await fetchRecordData(record, sub);

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <section className="mb-6 text-gray-200">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{record ? `${record.toUpperCase()} Records` : 'Records'}</h1>
          <p className="text-gray-300">{record ? `Record page for ${record}${sub ? ` / ${sub}` : ''}` : 'All records'}</p>
        </section>

        <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
          {data && data.length > 0 ? (
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-gray-300">
                  {Object.keys(data[0]).map((k) => (
                    <th key={k} className="px-2 py-1 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}>
                    {Object.values(row).map((v, j) => (
                      <td className="px-2 py-1 text-gray-200" key={j}>{String(v ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-400">No data available</div>
          )}
        </section>
      </main>
    );
  }

  const canonicalUrl = resolveUrl(`/records/${record}${sub ? `/${sub}` : ''}`);

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
  }

  const ServerComponent = record ? serverMap[record] : null;

  if (ServerComponent) {
    const sp = spResolved;
    const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
    const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']));
    const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']));
    const selectedRounds = (typeof (sp.round) === 'string' ? String(sp.round) : '');
    const selectedBestOf = sp.bestOf ? Number((sp.bestOf as string)) : null;

    // Compute description server-side so the client component receives it
    const activeSubResolved = sub ?? (typeof sp.subtab === 'string' ? kebabToKey(String(sp.subtab)) : undefined);
    const description = generateRecordDescription(record, { ...activeSubTabsDefault, [record || '']: activeSubResolved || activeSubTabsDefault[record || ''] }, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);

    // Build canonical URL including canonicalized query params
    const query = canonicalizeParamsObj(sp as any);
    const canonicalFull = canonicalUrl + (query ? `?${query}` : '');

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <SyncUrlClient url={canonicalFull} />
        <section className="mb-6 text-gray-200">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{description || (record ? `${record.toUpperCase()} Records` : 'Records')}</h1>

        </section>

        {/* Tabs + Filters */}
        <div className="mb-2">
          <RecordsTabs activeTab={record || null} activeSubTab={activeSubResolved || null} />
          <RecordsFilters activeTab={record || null} activeSubTab={activeSubResolved || null} searchParams={sp as any} />
        </div>

        {/* Server component with SSR prefetch */}
        <ServerComponent searchParams={sp} record={record} sub={activeSubResolved} canonicalUrl={canonicalFull} description={description} />
      </main>
    )
  }

  // Fallback: compute description and canonicalFull using searchParams so header + URL match
  const spFallback = spResolved as Record<string, any>;
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
  const selectedSurfacesFB = new Set(toArray(spFallback.surface ?? spFallback['surface[]']));
  const selectedLevelsFB = new Set(toArray(spFallback.level ?? spFallback['level[]']));
  const selectedRoundsFB = typeof spFallback.round === 'string' ? String(spFallback.round) : '';
  const selectedBestOfFB = spFallback.bestOf ? Number(spFallback.bestOf as string) : null;
  const activeSubResolvedFB = sub ?? (typeof spFallback.subtab === 'string' ? kebabToKey(String(spFallback.subtab)) : undefined);
  const descriptionFB = generateRecordDescription(record, { ...activeSubTabsDefault, [record || '']: activeSubResolvedFB || activeSubTabsDefault[record || ''] }, selectedSurfacesFB, selectedLevelsFB, selectedRoundsFB, selectedBestOfFB);
  const queryFB = canonicalizeParamsObj(spFallback);
  const canonicalFullFB = resolveUrl(`/records/${record}${activeSubResolvedFB ? `/${activeSubResolvedFB}` : ''}`) + (queryFB ? `?${queryFB}` : '');

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <SyncUrlClient url={canonicalFullFB} />
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{descriptionFB || (record ? `${record.toUpperCase()} Records` : 'Records')}</h1>
        <p className="text-gray-300">Filtered view — results are loaded client-side.</p>
      </section>

      <RecordsFilteredClient
        record={record}
        sub={activeSubResolvedFB}
        filters={spResolved}
        canonicalUrl={canonicalFullFB}
      />
    </main>
  );
}

