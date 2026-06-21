// Central rate-limited fetch used by SSR prefetch in `app/records`.
// - Default delay: 250ms in development, 0ms otherwise
// - Override with RECORDS_SSR_PREFETCH_DELAY_MS (ms)
// This serializes prefetch requests per Node process so API calls are spaced out
// (helps reduce bursty traffic from many server components rendering concurrently).

import { shouldShowRecordFilter, type FilterName } from './records/allowed-filters';

const DEFAULT_DEV_DELAY_MS = 250;
let _lastPromise: Promise<any> = Promise.resolve();
let _lastTime = 0;

const PREFETCHABLE_RECORDS_API_BASE = new Set([
  'wins', 'played', 'titles', 'entries', 'count', 'percentage',
]);

const PREFETCHABLE_RECORDS_API_SUBPATHS: Record<string, Set<string>> = {
  ages: new Set(['winners', 'maindraw']),
  atage: new Set(['wins', 'played', 'entries', 'titles', 'inslams', 'rounds', 'count']),
  ageofnth: new Set(['wins', 'played', 'entries', 'titles', 'inslams', 'rounds']),
  counterseasons: new Set(['wins', 'titles', 'rounds']),
  firstn: new Set(['count']),
  h2h: new Set(['count', 'timespan', 'seasons', 'sametournament']),
  least: new Set(['sets', 'minutes', 'gameslost', 'breaks', 'breakpoints']),
  neededto: new Set(['titles', 'rounds']),
  roundsonentries: new Set(['titles', 'rounds']),
  same: new Set(['wins', 'played', 'entries', 'titles', 'rounds', 'count']),
  seasons: new Set(['wins', 'played', 'entries', 'titles', 'rounds', 'percentage']),
  sets: new Set(['count', 'deciders', 'down2to1', 'lost1st', 'lost1st2nd', 'matches', 'split1st2nd', 'straights', 'up2to1', 'won1st', 'won1st2nd']),
  streak: new Set(['wins', 'rounds', 'streakwins', 'streaktournaments']),
  timespan: new Set(['entries', 'titles', 'rounds']),
};

function isExistingPrefetchableRecordsApiPath(pathname: string) {
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length < 3 || seg.length > 4) return false;
  if (seg[0] !== 'api' || seg[1] !== 'records') return false;

  const record = seg[2];
  const sub = seg[3];

  if (!sub) return PREFETCHABLE_RECORDS_API_BASE.has(record);

  return !!PREFETCHABLE_RECORDS_API_SUBPATHS[record]?.has(sub);
}

function kebabToKey(s?: string | null) {
  if (!s) return undefined;
  if (s.includes('-')) {
    return s
      .split('-')
      .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
  }
  return s;
}

function hasAnyParam(searchParams: URLSearchParams, names: string[]) {
  for (const name of names) {
    const values = searchParams.getAll(name).filter(v => v !== '');
    if (values.length > 0) return true;
  }
  return false;
}

function resolveApiRecordAndSub(pathname: string, searchParams: URLSearchParams) {
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length < 3 || seg[0] !== 'api' || seg[1] !== 'records') {
    return { record: null as string | null, sub: undefined as string | undefined };
  }

  const record = seg[2] || null;
  const rawSub = seg[3];
  if (!record) return { record: null as string | null, sub: undefined as string | undefined };

  const subMap: Record<string, string> = {
    rounds: 'round',
    winners: 'winners',
  };

  let sub = rawSub ? (subMap[rawSub] || rawSub) : undefined;

  if (record === 'ages' && (sub === 'winners' || sub === 'maindraw')) {
    const typeParam = (searchParams.get('type') || 'oldest').toLowerCase();
    if (sub === 'winners') sub = typeParam === 'youngest' ? 'youngestWinners' : 'oldestWinners';
    if (sub === 'maindraw') sub = typeParam === 'youngest' ? 'youngest' : 'oldest';
  }

  return { record, sub: kebabToKey(sub) };
}

function hasInvalidRecordFilter(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const checks: Array<{ present: boolean; filter: FilterName }> = [
    { present: hasAnyParam(searchParams, ['level', 'level[]']), filter: 'levels' },
    { present: hasAnyParam(searchParams, ['surface', 'surface[]']), filter: 'surfaces' },
    { present: hasAnyParam(searchParams, ['round', 'round[]']), filter: 'rounds' },
    { present: hasAnyParam(searchParams, ['bestOf', 'bestOf[]', 'best_of', 'best_of[]']), filter: 'bestOf' },
  ];

  return checks.some(({ present, filter }) => present && !shouldShowRecordFilter(filter, record, sub));
}

function hasMissingRequiredRecordsApiParams(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  if (record === 'atage') {
    const hasAge = searchParams.get('age') !== null && String(searchParams.get('age')).trim() !== '';
    if (sub === 'round') {
      const hasRound = searchParams.get('round') !== null && String(searchParams.get('round')).trim() !== '';
      return !hasAge || !hasRound;
    }
    if (['wins', 'played', 'entries', 'titles', 'inslams'].includes(sub || '')) {
      return !hasAge;
    }
  }

  if (record === 'ageofnth') {
    const hasN = searchParams.get('n') !== null && String(searchParams.get('n')).trim() !== '';
    if (sub === 'round') {
      const hasRound = searchParams.get('round') !== null && String(searchParams.get('round')).trim() !== '';
      return !hasN || !hasRound;
    }
    if (['wins', 'played', 'entries', 'titles', 'slams'].includes(sub || '')) {
      return !hasN;
    }
  }

  if (record === 'timespan' && sub === 'round') {
    const hasRound = searchParams.get('round') !== null && String(searchParams.get('round')).trim() !== '';
    return !hasRound;
  }

  if (record === 'neededto') {
    if (sub === 'titles') {
      const val = String(searchParams.get('maxTitles') || searchParams.get('n') || searchParams.get('seasons') || '').trim();
      if (!val) return true;
      const n = Number(val);
      return !Number.isFinite(n) || n <= 0;
    }
    if (sub === 'rounds' || sub === 'round') {
      const val = String(searchParams.get('round_number') || searchParams.get('n') || searchParams.get('seasons') || '').trim();
      if (!val) return true;
      const n = Number(val);
      return !Number.isFinite(n) || n <= 0;
    }
  }

  return false;
}

function parseInputUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) return input;
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) return new URL(input);
      if (input.startsWith('/')) return new URL(input, 'http://localhost');
      return null;
    }
    const req = input as Request;
    if (req?.url) return new URL(req.url);
    return null;
  } catch {
    return null;
  }
}

function getRecordsPrefetchSkipReason(input: RequestInfo | URL): string | null {
  const url = parseInputUrl(input);
  if (!url) return null;
  if (!url.pathname.startsWith('/api/records/')) return null;

  if (!isExistingPrefetchableRecordsApiPath(url.pathname)) return 'unknown-route';

  const { record, sub } = resolveApiRecordAndSub(url.pathname, url.searchParams);
  if (!record) return 'unknown-route';
  if (hasMissingRequiredRecordsApiParams(record, sub, url.searchParams)) return 'missing-required-params';
  if (hasInvalidRecordFilter(record, sub, url.searchParams)) return 'known-410';
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// In-process response cache — avoids HTTP round-trips for repeated SSR renders
// of the same records API URL within the same Node.js process.
// TTL defaults to 1 hour; override with RECORDS_IN_PROCESS_CACHE_TTL_MS.
// ---------------------------------------------------------------------------
interface _InProcessCacheEntry {
  body: string;
  expiresAt: number;
}
const _inProcessCache = new Map<string, _InProcessCacheEntry>();
// In-flight map de-duplicates concurrent requests for the same URL (thundering-herd guard).
const _inProcessInflight = new Map<string, Promise<string>>();

function _getInProcessCacheTtlMs(): number {
  const env = process.env.RECORDS_IN_PROCESS_CACHE_TTL_MS;
  if (env === undefined) return Infinity; // never expire by time; cleared on explicit revalidation
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Infinity;
}

/** Called by /api/revalidate when the records tag is invalidated (DB update). */
export function clearInProcessRecordsCache(): void {
  _inProcessCache.clear();
}

async function _fetchWithInProcessCache(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = parseInputUrl(input);
  // Only cache API records requests; fall back for anything else.
  if (!url || !url.pathname.startsWith('/api/records/')) {
    return fetch(input as any, init);
  }

  const key = url.pathname + url.search;
  const ttlMs = _getInProcessCacheTtlMs();

  // Return cached body if fresh.
  if (ttlMs > 0) {
    const cached = _inProcessCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(cached.body, {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
  }

  // De-duplicate concurrent in-flight requests for the same key.
  let inflight = _inProcessInflight.get(key);
  if (!inflight) {
    inflight = fetch(input as any, init)
      .then(async (res) => {
        const body = await res.text();
        if (res.ok && ttlMs > 0) {
          _inProcessCache.set(key, { body, expiresAt: Date.now() + ttlMs });
        }
        return body;
      })
      .finally(() => {
        _inProcessInflight.delete(key);
      });
    _inProcessInflight.set(key, inflight);
  }

  const body = await inflight;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Fixed rule: prefetch only known existing API records routes, and only valid parameter combinations.
  const skipReason = getRecordsPrefetchSkipReason(input);
  if (skipReason) {
    return new Response('[]', {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-records-prefetch-skipped': skipReason,
      },
    });
  }

  const envVal = process.env.RECORDS_SSR_PREFETCH_DELAY_MS;
  const defaultDelay = process.env.NODE_ENV === 'development' ? DEFAULT_DEV_DELAY_MS : 0;
  const delayMs = Number(envVal ?? defaultDelay) || 0;

  // no-op if throttling disabled — use in-process cache directly
  if (delayMs <= 0) return _fetchWithInProcessCache(input, init);

  // chain requests so they're spaced by at least `delayMs`
  const p = _lastPromise.then(async () => {
    const now = Date.now();
    const elapsed = now - _lastTime;
    if (elapsed < delayMs) await sleep(delayMs - elapsed);
    _lastTime = Date.now();
    return _fetchWithInProcessCache(input, init);
  });

  // keep chain alive even if a call fails
  _lastPromise = p.then(() => undefined, () => undefined);

  return p as Promise<Response>;
}
