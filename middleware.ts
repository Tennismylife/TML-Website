import { NextRequest, NextResponse } from 'next/server';
import { shouldShowRecordFilter, type FilterName } from './lib/records/allowed-filters';

/**
 * Local fallback mapping for player and tournament legacy codes -> slug.
 * Keep small and authoritative for local/dev usage.
 */
const slugMapPlayers: Record<string, string> = {
  'W367': 'novak-djokovic',
  'P123': 'roger-federer',
  // add more known player legacy mappings here...
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

function hasInvalidRecordFilter(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const checks: Array<{ present: boolean; filter: FilterName }> = [
    { present: hasAnyParam(searchParams, ['level', 'level[]']), filter: 'levels' },
    { present: hasAnyParam(searchParams, ['surface', 'surface[]']), filter: 'surfaces' },
    { present: hasAnyParam(searchParams, ['round', 'round[]']), filter: 'rounds' },
    { present: hasAnyParam(searchParams, ['bestOf', 'bestOf[]']), filter: 'bestOf' },
  ];

  return checks.some(({ present, filter }) => present && !shouldShowRecordFilter(filter, record, sub));
}

const RECORD_FILTER_PARAMS = ['level', 'level[]', 'surface', 'surface[]', 'round', 'round[]', 'bestOf', 'bestOf[]'];

function hasRecordsFilterParams(searchParams: URLSearchParams) {
  return hasAnyParam(searchParams, RECORD_FILTER_PARAMS);
}

function getHeader(req: NextRequest, name: string) {
  return req.headers?.get ? req.headers.get(name) : null;
}

function isRscRequest(req: NextRequest) {
  const purpose = getHeader(req, 'purpose');
  const prefetch = getHeader(req, 'next-router-prefetch');
  const rsc = getHeader(req, 'rsc');
  return purpose === 'prefetch' || prefetch === '1' || rsc === '1';
}

function resolveRecordApiRequest(record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  let apiSub = sub;

  if (record === 'ages') {
    if (sub === 'oldest' || sub === 'youngest') {
      apiSub = 'maindraw';
      params.set('type', sub);
    } else if (sub === 'oldestWinners' || sub === 'youngestWinners') {
      apiSub = 'winners';
      params.set('type', sub === 'youngestWinners' ? 'youngest' : 'oldest');
    }
  }

  const subMap: Record<string, string> = {
    round: 'rounds',
    slam: 'inslams',
    slams: 'inslams',
  };

  if (apiSub) apiSub = subMap[apiSub] || apiSub;

  return {
    pathname: `/api/records/${record}${apiSub ? `/${apiSub}` : ''}`,
    searchParams: params,
  };
}

function hasEmptyRecordData(payload: unknown) {
  if (Array.isArray(payload)) return payload.length === 0;
  if (!payload || typeof payload !== 'object') return false;

  const arrayValues = Object.values(payload).filter(Array.isArray) as unknown[][];
  if (arrayValues.length === 0) return false;

  return arrayValues.every(value => value.length === 0);
}

async function isEmptyRecordPage(origin: string, record: string, sub: string | undefined, searchParams: URLSearchParams) {
  const apiRequest = resolveRecordApiRequest(record, sub, searchParams);
  const apiUrl = new URL(apiRequest.pathname, origin);

  apiRequest.searchParams.forEach((value, key) => {
    apiUrl.searchParams.append(key, value);
  });

  const response = await fetch(apiUrl.toString(), { cache: 'no-store' });
  if (!response.ok) return null;

  const payload = await response.json();
  return hasEmptyRecordData(payload);
}

export async function middleware(req: NextRequest) {
  try {
    // Debugging disabled: verbose middleware request logging removed

    const requestPath = req.nextUrl.pathname;
    const query = req.nextUrl.searchParams;

    // Strict 410 for invalid records filter combinations.
    if (requestPath.startsWith('/records/')) {
      const { record, sub } = resolvePageRecordAndSub(requestPath);
      if (record && hasInvalidRecordFilter(record, sub, query)) {
        return new NextResponse('Gone', { status: 410 });
      }

      if (record && hasRecordsFilterParams(query) && !isRscRequest(req)) {
        try {
          const isEmpty = await isEmptyRecordPage(req.nextUrl.origin, record, sub, query);
          if (isEmpty) {
            return new NextResponse('Gone', { status: 410 });
          }
        } catch {}
      }
    }

    // Mirror the same rule for direct API calls.
    if (requestPath.startsWith('/api/records/')) {
      const { record, sub } = resolveApiRecordAndSub(requestPath, query);
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
        return NextResponse.next();
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

    if (segments.length < 2) return NextResponse.next();

    const resource = segments[0]; // 'players' or 'tournaments'
    if (resource !== 'players' && resource !== 'tournaments') return NextResponse.next();

    const idSegment = segments[1];
    if (!idSegment) return NextResponse.next();

    const rest = segments.slice(2).join('/');

    // 1) Numeric ID: header API
    if (/^\d+$/.test(idSegment)) {
      try {
        const apiUrl = `${origin}/api/${resource}/${encodeURIComponent(idSegment)}/header`;
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'no-store' });
        if (apiResp.ok) {
          const body = await apiResp.json();
          const slugFromApi = body?.slug;
          if (slugFromApi) {
            const dest = new URL(req.url);
            dest.pathname = `/${resource}/${slugFromApi}${rest ? '/' + rest : ''}`;
            dest.search = search;
            return new Response(null, { status: 301, headers: { Location: dest.toString() } });
          }
        }
      } catch {}
      return NextResponse.next();
    }

    const codeKey = String(idSegment).toUpperCase();
    let slug: string | undefined;
    let source: string | undefined;

    // 2) Slug-map API
    try {
      const apiUrl = `${origin}/api/slug-map`;
      const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
      if (apiResp.ok) {
        const maps = await apiResp.json();
        const mapForResource = maps?.[resource] || {};
        slug = mapForResource[codeKey];
        if (slug) source = 'slug-map-api';
      }
    } catch {}

    // 3) Local map
    if (!slug) {
      const map = resource === 'players' ? slugMapPlayers : slugMapTournaments;
      slug = map ? map[codeKey] : undefined;
      if (slug) source = 'local-map';
    }

    // 4) Header API fallback
    if (!slug) {
      try {
        const apiUrl = `${origin}/api/${resource}/${encodeURIComponent(idSegment)}/header`;
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

    // ⚡ Piccola correzione: fallback automatico dai codici legacy
    if (!slug) {
      slug = codeKey.toLowerCase();
      source = 'legacy-code-fallback';
    }

    // Prevenzione loop redirect
    if (slug && slug.toLowerCase() === String(idSegment).toLowerCase()) {
      return NextResponse.next();
    }

    // If we resolved a slug (from slug-map, header API or local map), redirect the
    // incoming request to the canonical slug path for both tournaments and players.
    if (slug) {
      const dest = new URL(req.url);
      dest.pathname = `/${resource}/${slug}${rest ? '/' + rest : ''}`;
      dest.search = search;
      return new Response(null, { status: 301, headers: { Location: dest.toString() } });
    }

    return NextResponse.next();
  } catch (err) {
    console.error('legacy redirect middleware error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*', '/records/:path*', '/recordsranking/:path*', '/api/records/:path*'],
};

// Note: don't re-export server-side DB helpers here to avoid pulling Prisma into the Edge middleware runtime.
// Use `import { trackVisit, trackVisitMiddleware } from './lib/visitTracker'` from server-side code or Express apps instead.
