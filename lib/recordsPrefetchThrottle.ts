// Central rate-limited fetch used by SSR prefetch in `app/records`.
// - Default delay: 250ms in development, 0ms otherwise
// - Override with RECORDS_SSR_PREFETCH_DELAY_MS (ms)
// This serializes prefetch requests per Node process so API calls are spaced out
// (helps reduce bursty traffic from many server components rendering concurrently).

import { shouldShowRecordFilter, type FilterName } from './records/allowed-filters';

const DEFAULT_DEV_DELAY_MS = 250;
let _lastPromise: Promise<any> = Promise.resolve();
let _lastTime = 0;

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

function shouldSkipKnownGoneRecordsPrefetch(input: RequestInfo | URL): boolean {
  const url = parseInputUrl(input);
  if (!url) return false;
  if (!url.pathname.startsWith('/api/records/')) return false;

  const { record, sub } = resolveApiRecordAndSub(url.pathname, url.searchParams);
  if (!record) return false;
  if (hasMissingRequiredRecordsApiParams(record, sub, url.searchParams)) return true;
  return hasInvalidRecordFilter(record, sub, url.searchParams);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Keep SSR prefetch enabled, but avoid fetching combinations we already know are 410.
  if (shouldSkipKnownGoneRecordsPrefetch(input)) {
    return new Response('[]', {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-records-prefetch-skipped': 'known-410',
      },
    });
  }

  const envVal = process.env.RECORDS_SSR_PREFETCH_DELAY_MS;
  const defaultDelay = process.env.NODE_ENV === 'development' ? DEFAULT_DEV_DELAY_MS : 0;
  const delayMs = Number(envVal ?? defaultDelay) || 0;

  // no-op if throttling disabled
  if (delayMs <= 0) return fetch(input as any, init);

  // chain requests so they're spaced by at least `delayMs`
  const p = _lastPromise.then(async () => {
    const now = Date.now();
    const elapsed = now - _lastTime;
    if (elapsed < delayMs) await sleep(delayMs - elapsed);
    _lastTime = Date.now();
    return fetch(input as any, init);
  });

  // keep chain alive even if a call fails
  _lastPromise = p.then(() => undefined, () => undefined);

  return p as Promise<Response>;
}
