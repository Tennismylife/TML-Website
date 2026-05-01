import { NextRequest, NextResponse } from 'next/server';
import { shouldShowRecordFilter, type FilterName } from './lib/records/allowed-filters';
import { evaluateRecordsPolicy, type RecordFilters } from './lib/seo/records-policy';

/**
 * Local fallback mapping for player and tournament legacy codes -> slug.
 * Keep small and authoritative for local/dev usage.
 */
const slugMapPlayers: Record<string, string> = {
  'W367': 'novak-djokovic',
  'P123': 'roger-federer',
  // add more known player legacy mappings here if needed for local/dev fallback
};

const slugMapTournaments: Record<string, string> = {
  'W367': 'united-cup',
  'P123': 'australian-open',
  // add more known tournament legacy mappings here...
};

/** Detect legacy codes like W367, P123 (letters followed by digits). */
const legacyCodeRegex = /^[A-Za-z]+\d+$/i;

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

function isSearchBot(userAgent: string) {
  if (!userAgent) return false;
  return /googlebot|bingbot|slurp|yahoo|duckduckgo|yandex|baiduspider|facebookexternalhit|twitterbot|linkedinbot|applebot/i.test(userAgent);
}

function isTournamentRecordsPath(pathname: string) {
  const seg = pathname.split('/').filter(Boolean);
  return seg.length >= 3 && seg[0] === 'tournaments' && seg[2] === 'records';
}

const VALID_PLAYER_TABS = new Set([
  'profile', 'matches', 'season', 'tournaments', 'h2h', 'performance', 'statistics', 'ranking',
]);

const RECORD_FILTER_QUERY_KEYS = new Set([
  'level', 'level[]',
  'surface', 'surface[]',
  'round', 'round[]',
  'bestOf', 'bestOf[]',
  'best_of', 'best_of[]',
]);

const PLAYER_MATCH_FILTER_KEYS = new Set([
  'year', 'tourney', 'level', 'surface', 'round', 'result', 'vsRank', 'vsAge', 'vsHand', 'vsBackhand', 'vsEntry', 'asRank', 'asEntry', 'set', 'firstSet', 'score'
]);

// Known valid surface values, sorted longest-first for greedy prefix matching.
const KNOWN_SURFACES = ['Unknown', 'Carpet', 'Grass', 'Hard', 'Clay'];

function sanitizeRecordsFilterQuery(searchParams: URLSearchParams) {
  const cleaned = new URLSearchParams();
  let changed = false;

  for (const [key, raw] of searchParams.entries()) {
    if (!RECORD_FILTER_QUERY_KEYS.has(key)) {
      cleaned.append(key, raw);
      continue;
    }

    const stripped = String(raw ?? '').replace(/\\+/g, '').trim();
    if (stripped !== raw) changed = true;

    if (!stripped) {
      changed = true;
      continue;
    }

    // Handle %3D-corrupted values: e.g. surface=Hardace%3Dhard arrives as
    // surface=Hardace=hard after URL decoding. Also normalize malformed
    // surface values that begin with a valid known surface prefix.
    let value = stripped;
    const eqIdx = value.indexOf('=');
    if (eqIdx !== -1) {
      value = value.slice(0, eqIdx);
      changed = true;
    }

    if (key === 'surface' || key === 'surface[]') {
      const lower = value.toLowerCase();
      const recovered = KNOWN_SURFACES.find(
        s => lower.startsWith(s.toLowerCase()) && lower.length > s.length
      );
      if (recovered) {
        value = recovered;
        changed = true;
      }
    }

    if (!value) {
      changed = true;
      continue;
    }

    if (key === 'bestOf' || key === 'bestOf[]' || key === 'best_of' || key === 'best_of[]') {
      const n = Number(value);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
        changed = true;
        continue;
      }
      cleaned.append(key, String(n));
      if (String(n) !== value) changed = true;
      continue;
    }

    // Normalize case for round/level (uppercase) and surface (Title-case)
    let normalized = value;
    if (key === 'round' || key === 'round[]') {
      normalized = value.toUpperCase();
    } else if (key === 'level' || key === 'level[]') {
      normalized = value.toUpperCase();
    } else if (key === 'surface' || key === 'surface[]') {
      normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    if (normalized !== value) changed = true;

    cleaned.append(key, normalized);
  }

  return { cleaned, changed };
}

function resolveApiRecordAndSub(pathname: string, searchParams: URLSearchParams) {
  const seg = pathname.split('/').filter(Boolean);
  // /api/records/:record/:sub?
  if (seg.length < 3 || seg[0] !== 'api' || seg[1] !== 'records') return { record: null as string | null, sub: undefined as string | undefined };

  const record = seg[2] || null;
  const rawSub = seg[3];

  if (!record) return { record: null as string | null, sub: undefined as string | undefined };

  // Normalize plural path segments used by some API endpoints.
  const subMap: Record<string, string> = {
    rounds: 'round',
    winners: 'winners',
  };

  let sub = rawSub ? (subMap[rawSub] || rawSub) : undefined;

  // Dynamic subtype for ages winners/maindraw endpoints.
  if (record === 'ages' && (sub === 'winners' || sub === 'maindraw')) {
    const typeParam = (searchParams.get('type') || 'oldest').toLowerCase();
    if (sub === 'winners') sub = typeParam === 'youngest' ? 'youngestWinners' : 'oldestWinners';
    if (sub === 'maindraw') sub = typeParam === 'youngest' ? 'youngest' : 'oldest';
  }

  return { record, sub: kebabToKey(sub) };
}

function resolvePageRecordAndSub(pathname: string) {
  const seg = pathname.split('/').filter(Boolean);
  // /records/:record/:sub?
  if (seg.length < 2 || seg[0] !== 'records') return { record: null as string | null, sub: undefined as string | undefined };
  const record = seg[1] || null;
  const sub = kebabToKey(seg[2]);
  return { record, sub };
}

function resolveTournamentRecordsPageRecordAndSub(pathname: string) {
  const seg = pathname.split('/').filter(Boolean);
  // /tournaments/:id/records/:record?/:sub?
  if (seg.length < 3 || seg[0] !== 'tournaments' || seg[2] !== 'records') {
    return { record: null as string | null, sub: undefined as string | undefined };
  }
  const record = seg[3] || null;
  const sub = kebabToKey(seg[4]);
  return { record, sub };
}

function hasAnyRecordsFilter(searchParams: URLSearchParams) {
  return hasAnyParam(searchParams, ['level', 'level[]', 'surface', 'surface[]', 'round', 'round[]', 'bestOf', 'bestOf[]']);
}

function queryToRecordFilters(searchParams: URLSearchParams): RecordFilters {
  const levels = [...searchParams.getAll('level'), ...searchParams.getAll('level[]')]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  const surfaces = [...searchParams.getAll('surface'), ...searchParams.getAll('surface[]')]
    .filter(Boolean)
    .map((value) => {
      const raw = String(value);
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    });
  const rounds = [...searchParams.getAll('round'), ...searchParams.getAll('round[]')]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  const bestOfValues = [...searchParams.getAll('bestOf'), ...searchParams.getAll('bestOf[]')]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && Number.isInteger(value) && value > 0);

  const filters: RecordFilters = {};
  if (levels.length) filters.level = levels;
  if (surfaces.length) filters.surface = surfaces;
  if (rounds.length) filters.round = rounds[0];
  if (bestOfValues.length) filters.bestOf = bestOfValues[0];
  return filters;
}

function hasInvalidRecordFilter(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const checks: Array<{ present: boolean; filter: FilterName }> = [
    { present: hasAnyParam(searchParams, ['level', 'level[]']), filter: 'levels' },
    { present: hasAnyParam(searchParams, ['surface', 'surface[]']), filter: 'surfaces' },
    { present: hasAnyParam(searchParams, ['round', 'round[]']), filter: 'rounds' },
    { present: hasAnyParam(searchParams, ['bestOf', 'bestOf[]']), filter: 'bestOf' },
  ];

  return checks.some(({ present, filter }) => present && !shouldShowRecordFilter(filter, record, sub));
}

function stripDisallowedRecordFilters(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const filterGroups: Array<{ keys: string[]; filter: FilterName }> = [
    { keys: ['level', 'level[]'], filter: 'levels' },
    { keys: ['surface', 'surface[]'], filter: 'surfaces' },
    { keys: ['round', 'round[]'], filter: 'rounds' },
    { keys: ['bestOf', 'bestOf[]', 'best_of', 'best_of[]'], filter: 'bestOf' },
  ];

  const disallowedKeys = new Set<string>();
  for (const group of filterGroups) {
    const hasValues = group.keys.some((k) => searchParams.getAll(k).some((v) => v !== ''));
    if (!hasValues) continue;
    if (!shouldShowRecordFilter(group.filter, record, sub)) {
      for (const k of group.keys) disallowedKeys.add(k);
    }
  }

  if (disallowedKeys.size === 0) return { cleaned: searchParams, changed: false };

  const cleaned = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (disallowedKeys.has(k)) continue;
    cleaned.append(k, v);
  }

  return { cleaned, changed: true };
}

function getUserAgent(req: NextRequest) {
  try {
    return String(req.headers?.get('user-agent') || '');
  } catch {
    return '';
  }
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

function isPlayersMatchesPath(pathname: string) {
  const seg = pathname.split('/').filter(Boolean);
  return seg[0] === 'players' && String(seg[2] || '').toLowerCase() === 'matches';
}

export async function middleware(req: NextRequest) {
  try {
    // Debugging disabled: verbose middleware request logging removed

    const requestPath = req.nextUrl.pathname;
    const query = req.nextUrl.searchParams;
    const ua = getUserAgent(req).toLowerCase();
    const nextResponse = () => {
      const res = NextResponse.next();
      if (isPlayersMatchesPath(requestPath)) {
        res.headers.set('X-Robots-Tag', 'noindex, follow');
      }
      return res;
    };

    // Normalize malformed records filters (e.g. trailing backslashes, bestOf=NaN)
    // before enforcing validity rules.
    if (
      requestPath.startsWith('/records/') ||
      requestPath.startsWith('/api/records/') ||
      isTournamentRecordsPath(requestPath)
    ) {
      const { cleaned, changed } = sanitizeRecordsFilterQuery(query);
      if (changed) {
        const dest = new URL(req.url);
        dest.search = cleaned.toString();

        // For internal node callers, avoid external redirect hops and serve
        // the cleaned target in a single request.
        if (requestPath.startsWith('/api/records/') && ua.includes('node')) {
          return NextResponse.rewrite(dest);
        }

        return new Response(null, { status: 307, headers: { Location: dest.toString() } });
      }
    }

    // Strict 410 for invalid records filter combinations.
    if (requestPath.startsWith('/records/')) {
      const { record, sub } = resolvePageRecordAndSub(requestPath);
      // When subtab is in the query string instead of the path (e.g. ?subtab=wins),
      // use it as the effective sub so filter validation is accurate for that subtab.
      const effectiveSub = sub ?? (query.get('subtab') ? kebabToKey(query.get('subtab')!) : undefined);
      if (record && hasInvalidRecordFilter(record, effectiveSub, query)) {
        return new NextResponse('Gone', { status: 410 });
      }
    }

    // Enforce the same guard on tournament records pages so invalid URLs never SSR.
    if (requestPath.startsWith('/tournaments/')) {
      const { record, sub } = resolveTournamentRecordsPageRecordAndSub(requestPath);
      if ((record && hasInvalidRecordFilter(record, sub, query)) || (!record && hasAnyRecordsFilter(query))) {
        return new NextResponse('Gone', { status: 410 });
      }
    }

    // Mirror the same rule for direct API calls.
    if (requestPath.startsWith('/api/records/')) {
      const { record, sub } = resolveApiRecordAndSub(requestPath, query);

      // Internal node-based warmers/crawlers can hit disallowed filter combos.
      // Canonicalize those API URLs instead of returning 410 to keep server-side scans clean.
      if (record && ua.includes('node')) {
        // If required parameters are missing, return a proper client error.
        if (hasMissingRequiredRecordsApiParams(record, sub, query)) {
          return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
        }

        const { cleaned, changed } = stripDisallowedRecordFilters(record, sub, query);
        if (changed) {
          const dest = new URL(req.url);
          dest.search = cleaned.toString();
          return new Response(null, { status: 307, headers: { Location: dest.toString() } });
        }
      }

      if (record && hasInvalidRecordFilter(record, sub, query)) {
        return NextResponse.json({ error: 'Gone' }, { status: 410 });
      }
    }

    // Server-side visit tracking: derive a readable pageTitle, filter bots, and call API route fire-and-forget
    try {
      const pathnameOnly = req.nextUrl?.pathname || '';
      // Skip tracking for API routes, Next internals and non-GET methods
      if (req.method === 'GET' && !pathnameOnly.startsWith('/api/') && !pathnameOnly.startsWith('/_next/') && !pathnameOnly.startsWith('/favicon.ico')) {
        // Read UA and forwarded IP (support both Next Request headers.get and plain header object shapes)
        const ua = req.headers?.get ? req.headers.get('user-agent') : (req.headers && (req.headers['user-agent'] || req.headers['User-Agent'])) || '';
        const xff = req.headers?.get ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')) : (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '';

        // Basic bot filtering on the middleware side to avoid extra calls
        const BOT_RE = /(bot|crawl|spider|slurp|curl|wget)/i;
        if (!BOT_RE.test(String(ua || ''))) {
          // Derive pageTitle from path: '/' -> 'Home', otherwise join segments, replace dashes with spaces
          let pageTitle: string | null = null;
          try {
            if (!pathnameOnly || pathnameOnly === '/' || pathnameOnly === '') pageTitle = 'Home';
            else {
              const parts = pathnameOnly.split('/').filter(Boolean).map(s => decodeURIComponent(String(s)).replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
              pageTitle = parts.join(' ').toLowerCase();
            }
          } catch (e) {
            pageTitle = null;
          }

          fetch(new URL('/api/track-visit', req.nextUrl.origin).toString(), {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-original-user-agent': ua || '',
              'x-original-ip': xff || '',
            },
            body: JSON.stringify({ pageTitle, pageUrl: req.nextUrl?.href || null }),
            // keepalive ensures the fetch will be attempted even during navigation/closing
            keepalive: true,
          }).catch(() => {});

          // Matomo server-side probe removed — no server-side Matomo calls from middleware.
          // If you want to reintroduce server-side Matomo tracking, add a safe, privacy-preserving call here.
        }
      }
    } catch (e) {}

    const { pathname, search } = req.nextUrl;
    const segments = pathname.split('/').filter(Boolean);
    const origin = req.nextUrl.origin;

    // Redirect legacy /player-vs-player to canonical /h2h
    if (pathname === '/player-vs-player' || pathname.startsWith('/player-vs-player/')) {
      const dest = new URL(req.url);
      dest.pathname = '/h2h' + pathname.slice('/player-vs-player'.length);
      return new Response(null, { status: 301, headers: { Location: dest.toString() } });
    }

    // Dev debug block removed: avoid noisy POSTs and console.error messages for season routes



    // If incoming path is /players/:slug/season with ?year=YYYY, redirect to canonical /players/:slug/season/YYYY
    // This ensures a consistent canonical URL for SEO and that the per-year dynamic page handles metadata
    if (segments[0] === 'players' && segments[2] === 'season' && (!segments[3] || segments[3] === '') ) {
      const year = req.nextUrl.searchParams.get('year');
      if (year && /^[0-9]{4}$/.test(year)) {
        const slug = segments[1];
        const dest = new URL(req.url);
        dest.pathname = `/players/${slug}/season/${year}`;
        // Remove 'year' from search when redirecting to the canonical path
        const newSearch = new URLSearchParams(req.nextUrl.searchParams as any);
        newSearch.delete('year');
        dest.search = newSearch.toString();
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }
    }

    // Redirect any /players/:slug/matches requests from search engine bots to the player landing page.
    // Real users keep the /matches tab path.
    if (segments[0] === 'players' && String(segments[2] || '').toLowerCase() === 'matches') {
      const isBot = isSearchBot(ua);
      if (isBot) {
        const playerSlug = segments[1];
        const dest = new URL(req.url);
        dest.pathname = `/players/${playerSlug}`;
        dest.search = '';
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }
    }

    // Normalize any /recordsranking path segments to lowercase canonical form
    if (segments[0] === 'recordsranking' && segments[1]) {
      const lowerSegments = [segments[0], ...segments.slice(1).map(s => String(s).toLowerCase())];
      const normalizedPath = '/' + lowerSegments.join('/');
      const currentPath = req.nextUrl.pathname.replace(/\/$/, '');
      if (normalizedPath !== currentPath) {
        const dest = new URL(req.url);
        dest.pathname = normalizedPath;
        dest.search = req.nextUrl.search;
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }
    }

    // If path is /records/<record>
    if (segments[0] === 'records' && segments[1]) {
      const VALID_RECORDS = new Set([
        "wins",
        "played",
        "count",
        "titles",
        "entries",
        "ages",
        "timespan",
        "percentage",
        "roundsonentries",
        "same",
        "seasons",
        "atage",
        "ageofnth",
        "neededto",
        "counterseasons",
        "h2h",
        "streak",
      ]);

      const recordSegment = String(segments[1]).toLowerCase();
      if (VALID_RECORDS.has(recordSegment)) {
        // If the URL uses ?subtab=<x> while the canonical form is /records/<record>/<subtab>, redirect to the canonical path
        const subtabParam = req.nextUrl.searchParams.get('subtab');
        // helper: normalize subtab values to kebab-case (handles camelCase like 'youngestWinners')
        const normalizeSubtab = (s: string | null) => {
          if (!s) return s;
          if (s.includes('-')) return s; // already kebab
          return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
        };
        // Only redirect when the subtab is provided as a query and not already present as a path segment
        if (subtabParam && !(segments.length > 2)) {
          const normalized = normalizeSubtab(subtabParam);
          const dest = new URL(req.url);
          dest.pathname = `/records/${encodeURIComponent(recordSegment)}${normalized ? '/' + encodeURIComponent(normalized) : ''}`;
          // Preserve other query params except `subtab`
          const newSearch = new URLSearchParams(req.nextUrl.searchParams as any);
          newSearch.delete('subtab');
          dest.search = newSearch.toString();
          return new Response(null, { status: 301, headers: { Location: dest.toString() } });
        }

        // No rewrite here: allow the request to continue to /records/<record>
        // so the page at `/records/[...slug]` can render the specific record view
        // using the path + any query params (e.g., surface/level).
        return nextResponse();
      }
    }

    // Redirect non-indexable /records filter combinations back to the base record landing for bots only.
    if (segments[0] === 'records' && segments[1] && isSearchBot(ua)) {
      const { record, sub } = resolvePageRecordAndSub(requestPath);
      const effectiveSub = sub ?? (query.get('subtab') ? kebabToKey(query.get('subtab')!) : undefined);
      if (record) {
        const filters = queryToRecordFilters(query);
        if (!sub && effectiveSub) {
          filters.subtab = effectiveSub;
        }
        const slug = [record];
        if (sub || query.get('subtab')) {
          slug.push(effectiveSub || '');
        }
        const policy = evaluateRecordsPolicy(origin, slug.filter(Boolean), filters);
        if (!policy.index) {
          const dest = new URL(req.url);
          dest.search = '';
          return new Response(null, { status: 307, headers: { Location: dest.toString() } });
        }
      }
    }

    // Handle legacy records query URL: /records?record=<x>&subtab=<y>&... -> /records/<x>/<y>?<other-params>
    if (segments[0] === 'records') {
      const recordParam = req.nextUrl.searchParams.get('record');
      if (recordParam) {
        const subtabParam = req.nextUrl.searchParams.get('subtab');
        // normalize subtab to kebab-case as above
        const normalizeSubtab = (s: string | null) => {
          if (!s) return s;
          if (s.includes('-')) return s; // already kebab
          return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
        };
        const normalized = normalizeSubtab(subtabParam);
        const dest = new URL(req.url);
        dest.pathname = `/records/${encodeURIComponent(recordParam)}${normalized ? '/' + encodeURIComponent(normalized) : ''}`;
        // Preserve other query params except `record` and `subtab`
        const newParams = new URLSearchParams(req.nextUrl.searchParams as any);
        newParams.delete('record');
        newParams.delete('subtab');
        dest.search = newParams.toString();
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }
    }

    if (segments.length < 2) return nextResponse();

    const resource = segments[0]; // 'players' or 'tournaments'
    if (resource !== 'players' && resource !== 'tournaments') return nextResponse();

    const idSegment = segments[1];
    if (!idSegment) return nextResponse();

    const rest = segments.slice(2).join('/');

    // Normalize ?tab= query param to path segment for player pages.
    // e.g. /players/slug?tab=matches&bestOf=3 -> /players/slug/matches?bestOf=3
    // This eliminates the client-side replaceState soft redirect that Google
    // classifies as "non indicizzata causa reindirizzamento".
    if (resource === 'players' && !rest) {
      const tabParam = query.get('tab');
      if (tabParam && VALID_PLAYER_TABS.has(tabParam.toLowerCase())) {
        const dest = new URL(req.url);
        dest.pathname = `/players/${idSegment}/${tabParam.toLowerCase()}`;
        const newSearch = new URLSearchParams(query as any);
        newSearch.delete('tab');
        dest.search = newSearch.toString();
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }

      const hasPlayerFilterParams = Array.from(query.keys()).some(key => RECORD_FILTER_QUERY_KEYS.has(key));
      if (hasPlayerFilterParams) {
        const dest = new URL(req.url);
        const sanitized = new URLSearchParams(query as any);
        for (const key of RECORD_FILTER_QUERY_KEYS) {
          sanitized.delete(key);
        }
        dest.search = sanitized.toString();
        return new Response(null, { status: 301, headers: { Location: dest.toString() } });
      }
    }

    // Resolve canonical slug for both numeric IDs and legacy codes via slug-map.
    // The slug-map includes numeric ID → slug mappings (e.g. 405 → houston),
    // so we don't need a separate numeric-only branch that calls the header API,
    // which can fail silently in Docker when the container can't loop back externally.
    //
    // IMPORTANT: use NEXT_PRIVATE_BASE_URL (http://localhost:3000) inside Docker
    // so the container doesn't try to reach its own external domain (which fails).
    const canonicalHost = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const internalBase = process.env.NEXT_PRIVATE_BASE_URL || canonicalHost;
    let slug: string | undefined;
    let source: string | undefined;
    const codeKey = String(idSegment).toUpperCase();

    // 1) Slug-map API (handles numeric IDs and legacy codes)
    try {
      const apiUrl = `${internalBase}/api/slug-map`;
      const apiResp = await fetch(apiUrl, { method: 'GET', next: { revalidate: 3600 } } as RequestInit);
      if (apiResp.ok) {
        const maps = await apiResp.json();
        const mapForResource = maps?.[resource] || {};
        // Try exact key (e.g. '405', 'SD32', 'HOUSTON')
        slug = mapForResource[codeKey] ?? mapForResource[String(idSegment)];
        if (slug) source = 'slug-map-api';
      }
    } catch {}

    // 2) Local map fallback
    if (!slug) {
      const map = resource === 'players' ? slugMapPlayers : slugMapTournaments;
      slug = map ? map[codeKey] : undefined;
      if (slug) source = 'local-map';
    }

    // 3) Header API fallback (last resort)
    if (!slug) {
      try {
        const apiUrl = `${internalBase}/api/${resource}/${encodeURIComponent(idSegment)}/header`;
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'no-store' });
        if (apiResp.ok) {
          const body = await apiResp.json();
          if (body && body.slug) {
            slug = body.slug;
            source = 'header-api';
          }
        }
      } catch {}
    }

    // Prevent redirect when the incoming path already matches the canonical slug exactly.
    // This still allows redirects for case-only mismatches like /players/C022 -> /players/c022.
    if (slug && slug === idSegment) {
      return nextResponse();
    }

    // If we resolved a slug (from slug-map, header API or local map), redirect the
    // incoming request to the canonical slug path for both tournaments and players.
    if (slug) {
      const dest = new URL(req.url);
      dest.pathname = `/${resource}/${slug}${rest ? '/' + rest : ''}`;
      dest.search = search;
      return new Response(null, { status: 301, headers: { Location: dest.toString() } });
    }

    return nextResponse();
  } catch (err) {
    console.error('legacy redirect middleware error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*', '/records/:path*', '/recordsranking/:path*', '/api/records/:path*', '/player-vs-player', '/player-vs-player/:path*'],
};

// Note: don't re-export server-side DB helpers here to avoid pulling Prisma into the Edge middleware runtime.
// Use `import { trackVisit, trackVisitMiddleware } from './lib/visitTracker'` from server-side code or Express apps instead.
