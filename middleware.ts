import { NextRequest, NextResponse } from 'next/server';

/**
 * Convert a string into a canonical URL slug.
 * Example: "Paolo Bertolucci" -> "paolo-bertolucci"
 */
function toSlug(str: string) {
  return str
    .normalize('NFD')               // separa accenti dai caratteri
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // sostituisce tutto non alfanumerico con -
    .replace(/^-+|-+$/g, '');      // rimuove eventuali - iniziali/finali
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

    // Se è già uno slug “canonico” (solo lettere, numeri e trattini), lascia stare
    if (/^[a-z0-9-]+$/.test(idSegment)) return NextResponse.next();

    // Prova a recuperare il nome reale dal header API
    let canonicalName: string | undefined;
    try {
      const apiResp = await fetch(`${origin}/api/${resource}/${encodeURIComponent(idSegment)}/header`, { cache: 'no-store' });
      if (apiResp.ok) {
        const body = await apiResp.json();
        canonicalName = body?.name; // nome reale
      }
    } catch {}

    // Se non abbiamo nome, usa il codice come fallback
    const finalSlug = toSlug(canonicalName || idSegment);

    // Redirect 301 verso lo slug canonico
    const dest = new URL(req.url);
    dest.pathname = `/${resource}/${finalSlug}${rest ? '/' + rest : ''}`;
    dest.search = search;

    return NextResponse.redirect(dest, 301);
  } catch (err) {
    console.error('legacy slug middleware error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*'],
};
