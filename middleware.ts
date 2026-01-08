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
    if (segments.length < 2) return NextResponse.next();

    const resource = segments[0]; // 'players' or 'tournaments'
    if (resource !== 'players' && resource !== 'tournaments') return NextResponse.next();

    const idSegment = segments[1];
    if (!idSegment) return NextResponse.next();

    const rest = segments.slice(2).join('/');
    const origin = req.nextUrl.origin;

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
