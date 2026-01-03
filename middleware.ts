import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Central middleware to canonicalize numeric IDs to slug URLs with 301 redirects
// Applies to /players/:id* and /tournaments/:id* (only if :id is numeric)

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname; // e.g., /players/123/matches

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return NextResponse.next();

  const [first, second, ...rest] = parts; // first='players'|'tournaments', second=maybe id

  // Only handle players and tournaments
  if (first !== 'players' && first !== 'tournaments') return NextResponse.next();

  // If second segment is not purely numeric, nothing to do
  if (!/^\d+$/.test(second)) return NextResponse.next();

  const id = second;

  // Build API path
  const apiPath = first === 'players' ? `/api/players/${id}/header` : `/api/tournaments/${id}/header`;
  const base = request.nextUrl.origin;
  const apiUrl = base + apiPath;

  const data = await fetchJson(apiUrl);
  if (!data) return NextResponse.next();

  const slug = data.slug;
  if (!slug) return NextResponse.next();

  // Build new pathname: replace numeric id with slug
  const restPath = rest.length ? '/' + rest.join('/') : '';
  const newPathname = `/${first}/${slug}${restPath}`;

  // Preserve query string
  const dest = new URL(newPathname + url.search, base);

  // Issue permanent redirect (301)
  return NextResponse.redirect(dest, 301);
}

export const config = {
  matcher: ['/players/:path*', '/tournaments/:path*'],
};
