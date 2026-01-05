import { NextRequest, NextResponse } from 'next/server';

/**
 * Local fallback mapping for player and tournament legacy codes -> slug.
 */
const slugMapPlayers: Record<string, string> = {
  'W367': 'novak-djokovic',
  'P123': 'roger-federer',
  // altri player...
};

const slugMapTournaments: Record<string, string> = {
  'W367': 'united-cup',
  'P123': 'australian-open',
  // altri tornei...
};

/**
 * Memoization runtime per evitare fetch ripetuti
 * Chiave: `${resource}:${legacyCode}`
 */
const runtimeCache: Record<string, string> = {};

/**
 * Timeout helper per fetch
 */
async function fetchWithTimeout(url: string, timeout = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname, search } = req.nextUrl;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 2) return NextResponse.next();

    const resource = segments[0]; // 'players' o 'tournaments'
    if (resource !== 'players' && resource !== 'tournaments') return NextResponse.next();

    const idSegment = segments[1];
    if (!idSegment) return NextResponse.next();
    const rest = segments.slice(2).join('/');
    const origin = req.nextUrl.origin;

    // Controlla se è già uno slug canonico
    if (idSegment.match(/^[a-z0-9-]+$/i) && !/^\d+$/.test(idSegment)) {
      return NextResponse.next();
    }

    const key = `${resource}:${idSegment.toUpperCase()}`;
    let slug: string | undefined = runtimeCache[key];

    // Se non presente in runtime cache, prova slug-map API
    if (!slug) {
      try {
        const apiResp = await fetchWithTimeout(`${origin}/api/slug-map`, 2000);
        if (apiResp?.ok) {
          const maps = await apiResp.json();
          const mapForResource = maps?.[resource] || {};
          slug = mapForResource[idSegment.toUpperCase()];
          if (slug) runtimeCache[key] = slug; // salva in cache runtime
        }
      } catch {
        // ignore
      }
    }

    // fallback a map locale
    if (!slug) {
      const map = resource === 'players' ? slugMapPlayers : slugMapTournaments;
      slug = map[idSegment.toUpperCase()];
      if (slug) runtimeCache[key] = slug;
    }

    // fallback header API (solo se necessario)
    if (!slug && /^\d+$/.test(idSegment)) {
      try {
        const apiResp = await fetchWithTimeout(`${origin}/api/${resource}/${idSegment}/header`, 2000);
        if (apiResp?.ok) {
          const body = await apiResp.json();
          if (body?.slug) {
            slug = body.slug;
            runtimeCache[key] = slug;
          }
        }
      } catch {
        // ignore
      }
    }

    // Se slug trovato e diverso dall’attuale segmento → redirect 301
    if (slug && slug.toLowerCase() !== idSegment.toLowerCase()) {
      const dest = new URL(req.url);
      dest.pathname = `/${resource}/${slug}${rest ? '/' + rest : ''}`;
      dest.search = search;
      return NextResponse.redirect(dest, 301);
    }

    return NextResponse.next();
  } catch (err) {
    console.error('legacy redirect middleware error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*'],
};
