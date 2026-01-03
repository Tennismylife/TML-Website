import { NextRequest, NextResponse } from 'next/server';

/**
 * Local fallback mapping for player and tournament legacy codes -> slug.
 * Keys: uppercase legacy codes (e.g., 'W367').
 * Values: canonical slug strings used by the site.
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

/**
 * Unified middleware for players and tournaments.
 */
export async function middleware(req: NextRequest) {
  try {
    const { pathname, search } = req.nextUrl;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 2) return NextResponse.next();

    const resource = segments[0]; // 'players' or 'tournaments'
    if (resource !== 'players' && resource !== 'tournaments') return NextResponse.next();

    const idSegment = segments[1];
    if (!idSegment) return NextResponse.next();

    const rest = segments.slice(2).join('/');
    const origin = req.nextUrl.origin;

    // 1) Numeric ID: call header API and redirect 301 if slug returned
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
            console.log(`[middleware] numeric ${resource} id=${idSegment} -> slug=${slugFromApi} (header API)`);
            return new Response(null, { status: 301, headers: { Location: dest.toString() } }); // explicit permanent 301 redirect
          }
        }
      } catch (e) {
        console.error(`${resource} header API error (numeric id)`, e);
      }
      return NextResponse.next(); // numeric but not resolvable
    }

    // 2) Non-numeric: prefer runtime slug-map API (fast cache-enabled), fallback to local map, then header API
    const codeKey = String(idSegment).toUpperCase();

    // Try fetch runtime slug-map (cache-friendly) first
    let slug: string | undefined = undefined;
    let source: string | undefined = undefined;
    try {
      const apiUrl = `${origin}/api/slug-map`;
      const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
      if (apiResp.ok) {
        const maps = await apiResp.json();
        const mapForResource = maps?.[resource] || {};
        slug = mapForResource[codeKey];
        if (slug) source = 'slug-map-api';
      }
    } catch (e) {
      // ignore and fallback to local map
    }

    // fallback to local in-file maps
    if (!slug) {
      const map = resource === 'players' ? slugMapPlayers : slugMapTournaments;
      slug = map ? map[codeKey] : undefined;
      if (slug) source = 'local-map';
    }

    // fallback to header API if still not found
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
      } catch (e) {
        console.error(`${resource} header API error (fallback)`, e);
      }
    }

    if (slug) console.log(`[middleware] ${resource} id=${idSegment} -> slug=${slug} (source=${source || 'unknown'})`);

    // Prevent redirect loops: if the current segment is already the canonical slug (case-insensitive), do nothing
    if (slug && slug.toLowerCase() === String(idSegment).toLowerCase()) {
      console.log(`[middleware] ${resource} id=${idSegment} is already canonical; skipping redirect`);
      return NextResponse.next();
    }

    if (slug) {
      const dest = new URL(req.url);
      dest.pathname = `/${resource}/${slug}${rest ? '/' + rest : ''}`;
      dest.search = search;
      return new Response(null, { status: 301, headers: { Location: dest.toString() } }); // explicit permanent 301 redirect
    }

    // No slug found — continue normally
    return NextResponse.next();
  } catch (err) {
    console.error('legacy redirect middleware error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*'],
};
