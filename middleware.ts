import { NextRequest, NextResponse } from 'next/server';

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

export async function middleware(req: NextRequest) {
  try {
    // Debugging: log incoming requests for players/tournaments/records to diagnose unexpected 405s
    try { console.debug('[middleware] %s %s', req.method || 'UNKNOWN', req.nextUrl?.pathname + (req.nextUrl?.search || '')); } catch (e) {}

    const { pathname, search } = req.nextUrl;
    const segments = pathname.split('/').filter(Boolean);
    const origin = req.nextUrl.origin;

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
          dest.pathname = `/records/${encodeURIComponent(recordSegment)}/${encodeURIComponent(normalized)}`;
          // Preserve other query params except `subtab`
          const newParams = new URLSearchParams(req.nextUrl.searchParams as any);
          newParams.delete('subtab');
          dest.search = newParams.toString();
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

    // Redirect 301 al canonical slug
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
  matcher: ['/players/:path*', '/tournaments/:path*', '/records/:path*'],
};
