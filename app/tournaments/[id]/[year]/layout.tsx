import type { Metadata } from 'next';
import React from 'react';
import { prisma } from '@/lib/prisma';

export const revalidate = 86400; // ISR: revalidate every 24 h — emits Cache-Control: public for Googlebot
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import { IOC_TO_ISO } from '@/lib/utils';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

const DESCRIPTION =
  'Explore tournament results, draw details and match stats — live updates, player performance, match outcomes and context for detailed analysis and trends.';

function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const v = value[i];
      if (v) return firstString(v);
    }
    return '';
  }
  if (typeof value === 'object') {
    const vals = Object.values(value);
    for (const v of vals) {
      if (v) return firstString(v);
    }
    return '';
  }
  return '';
}

let isoCountriesReady = false;

function toIsoCountryCode(value?: string): string | undefined {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const upper = raw.toUpperCase();

  if (/^[A-Z]{2}$/.test(upper)) return upper;
  if (/^[A-Z]{3}$/.test(upper)) return IOC_TO_ISO[upper] ?? undefined;

  if (!isoCountriesReady) {
    try {
      countries.registerLocale(enLocale as any);
      isoCountriesReady = true;
    } catch {
      isoCountriesReady = true;
    }
  }

  const direct = countries.getAlpha2Code(raw, 'en');
  if (direct) return direct;

  const normalized = raw.replace(/[.,]/g, '').trim();
  const normalizedCode = normalized ? countries.getAlpha2Code(normalized, 'en') : undefined;
  return normalizedCode || undefined;
}

/**
 * Get an edition-specific value from a JSON field stored on the Tournament row.
 * If the field is an object mapping years -> values, prefer the value for `year`.
 * Falls back to firstString(field) otherwise.
 */
export function getEditionValue(field: any, year: number): string | undefined {
  if (!field) return undefined;
  // If field is an object that maps year to a value, try to fetch it
  if (typeof field === 'object' && !Array.isArray(field)) {
    const val = field[String(year)] ?? field[year] ?? field['default'] ?? field['name'] ?? null;
    if (val) return firstString(val);
  }
  // Otherwise fall back to firstString which handles arrays/objects gracefully
  const s = firstString(field);
  return s || undefined;
}

/**
 * Build a JSON-LD `<script type="application/ld+json">` string for a tournament.
 * Exported for use inside page components; do NOT inject directly in `generateMetadata`.
 */
export function buildTournamentJsonLd({
  name,
  year,
  surface,
  city,
  country,
  startDate,
  winner,
  finalist,
}: {
  name?: string;
  year?: string | number;
  surface?: string;
  city?: string;
  country?: string;
  startDate?: string;
  winner?: string;
  finalist?: string;
}): string {
  const event: any = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    sport: 'Tennis',
  };

  if (name || year) event.name = [name, year].filter(Boolean).join(' ');
  if (startDate) event.startDate = startDate;

  // Prefer to include surface in the description
  const descriptionParts: string[] = [];
  if (surface) descriptionParts.push(`Surface: ${surface}`);
  if (descriptionParts.length) event.description = descriptionParts.join('; ');

  // Only set addressLocality if it looks like a city (heuristic):
  // don't use it when it appears to be a country or nationality adjective similar to country.
  const cityLower = city ? String(city).trim().toLowerCase() : '';
  const countryLower = country ? String(country).trim().toLowerCase() : '';
  const shouldSetCity = Boolean(city) && cityLower.length > 1 && (!countryLower || cityLower.slice(0, 5) !== countryLower.slice(0, 5));

  const countryCode = toIsoCountryCode(country);

  if (shouldSetCity || countryCode) {
    event.location = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(shouldSetCity ? { addressLocality: city } : {}),
        ...(countryCode ? { addressCountry: countryCode } : {}),
      },
    };
  }

  const competitors: any[] = [];
  if (winner) competitors.push({ '@type': 'Person', name: winner, role: 'winner' });
  if (finalist) competitors.push({ '@type': 'Person', name: finalist, role: 'finalist' });
  if (competitors.length) event.competitor = competitors;

  const json = JSON.stringify(event);
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Build JSON-LD for a tournament directly from the database using Prisma.
 * Accepts a route `id` (slug or numeric) and `year`, resolves canonical slug
 * and queries the DB for tournament info and the final match (to get winner/finalist).
 * Returns a string containing the `<script type="application/ld+json">`.
 */
export async function buildTournamentJsonLdFromDb({ id, year }: { id: string; year: string | number }): Promise<string> {
  try {
    if (!id || !year) return '';
    const yearNum = Number(year);
    if (isNaN(yearNum)) return '';

    // Resolve canonical slug like in generateMetadata (numeric -> canonical id -> lookup, slug -> lookup)
    let tourneyRow: any = null;
    let slug: string | undefined;

    if (/^\d+$/.test(id)) {
      const canonicalId = await resolveCanonicalTourneyId(id);
      if (!canonicalId) return '';
      tourneyRow = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
      if (!tourneyRow?.slug) return '';
      slug = tourneyRow.slug;
    } else {
      tourneyRow = await prisma.tournament.findUnique({ where: { slug: id } });
      slug = tourneyRow?.slug ?? id;
    }

    // Resolve tourney ids used in match table (may return multiple ids for special cases)
    const { resolveTourneyIds } = await import('@/lib/tournament');
    let tourneyIds: string[] | null = null;
    try {
      tourneyIds = await resolveTourneyIds(id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('resolveTourneyIds threw in buildTournamentJsonLdFromDb', { id, err, digest: (err as any)?.digest ?? null, stack: (err as any)?.stack ?? null });
      return '';
    }
    if (!tourneyIds) return '';
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    // Find final match for the edition (prefer most recent if multiple)
    let finalMatch: any = null;
    try {
      finalMatch = await prisma.match.findFirst({
        where: { AND: [ { OR: tourneyIdFilters }, { year: yearNum }, { round: 'F' } ] },
        orderBy: { id: 'desc' },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('prisma.match.findFirst failed in buildTournamentJsonLdFromDb', { id, year, err, stack: (err as any)?.stack ?? null });
      finalMatch = null;
    }

    // Determine startDate surface, winner, finalist
    // Prefer edition-specific startDate stored on the tournament (JSON mapping year->date)
    // FALLBACK: use final match date if present, otherwise fall back to `${year}-01-01` for future years
    // Note: intentionally avoid using the tournament-level startDate (first edition) as a default
    const editionStart = tourneyRow ? getEditionValue(tourneyRow.startDate, yearNum) : undefined;
    const startDateRaw = editionStart ?? finalMatch?.tourney_date ?? null;
    const startDate = startDateRaw ? new Date(startDateRaw).toISOString().split('T')[0] : `${String(yearNum)}-01-01`;
    const surface = firstString(finalMatch?.surface ?? tourneyRow?.surfaces ?? '');

    let winnerName: string | undefined = undefined;
    let finalistName: string | undefined = undefined;

    if (finalMatch?.winner_id) {
      try {
        const winner = await prisma.player.findUnique({ where: { id: finalMatch.winner_id } });
        winnerName = winner?.atpname ?? winner?.player ?? undefined;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('prisma.player.findUnique failed for winner in buildTournamentJsonLdFromDb', { id, year, winner_id: finalMatch.winner_id, err, stack: (err as any)?.stack ?? null });
      }
    }
    if (finalMatch?.loser_id) {
      try {
        const finalist = await prisma.player.findUnique({ where: { id: finalMatch.loser_id } });
        finalistName = finalist?.atpname ?? finalist?.player ?? undefined;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('prisma.player.findUnique failed for finalist in buildTournamentJsonLdFromDb', { id, year, loser_id: finalMatch.loser_id, err, stack: (err as any)?.stack ?? null });
      }
    }

    const name = tourneyRow ? firstString(tourneyRow.name) : undefined;
    // Use edition-specific city/country values from the tournament JSON when available
    const city = tourneyRow ? getEditionValue(tourneyRow.city, yearNum) : undefined;
    const country = tourneyRow ? getEditionValue(tourneyRow.country, yearNum) : undefined;

    return buildTournamentJsonLd({
      name: name,
      year: yearNum,
      surface: surface,
      city: city,
      country: country,
      startDate: startDate,
      winner: winnerName,
      finalist: finalistName,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('buildTournamentJsonLdFromDb failed', { id, year, err });
    return '';
  }
}

/**
 * Fetch edition info used by both `generateMetadata` and the page rendering.
 * Returns null when the tournament slug/id cannot be resolved.
 *
 * When resolved this returns an object { tourneyRow, tourneyIds, hasMatches }
 * where `hasMatches` is a boolean indicating whether this edition has matches.
 * Note: `hasMatches === false` is *not* treated as a 404 – the page should
 * render and let the client component show a "no matches" state.
 */
export async function fetchEditionInfo({ id, year }: { id: string; year: string | number }) {
  try {
    if (!id || !year) return null;
    const yearNum = Number(year);
    if (isNaN(yearNum)) return null;

    let tourneyRow: any = null;

    if (/^\d+$/.test(id)) {
      const canonicalId = await resolveCanonicalTourneyId(id);
      if (!canonicalId) return null;
      // If the tournament row is missing, still proceed: matches may exist
      // even when the tournament metadata row is absent.
      tourneyRow = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
    } else {
      tourneyRow = await prisma.tournament.findUnique({ where: { slug: id } });
      if (!tourneyRow) return null;
    }

    const { resolveTourneyIds } = await import('@/lib/tournament');
    let tourneyIds: string[] | null = null;
    try {
      tourneyIds = await resolveTourneyIds(id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('resolveTourneyIds threw in fetchEditionInfo', { id, year, err, digest: (err as any)?.digest ?? null, stack: (err as any)?.stack ?? null });
      return null;
    }
    if (!tourneyIds) return null;
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    let matchExists: any = null;
    try {
      matchExists = await prisma.match.findFirst({ where: { AND: [ { OR: tourneyIdFilters }, { year: yearNum } ] }, select: { id: true } });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('prisma.match.findFirst failed in fetchEditionInfo', { id, year, err, stack: (err as any)?.stack ?? null });
      // Treat as unresolved (null) so the calling code can decide to show a friendly fallback
      return null;
    }

    return { tourneyRow, tourneyIds, hasMatches: Boolean(matchExists) };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('fetchEditionInfo failed', { id, year, err });
    // Also log a warning so it's easier to spot in dev output
    // eslint-disable-next-line no-console
    console.warn('fetchEditionInfo returning null due to error', { id, year });
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string; year: string } }): Promise<Metadata> {
  try {
    const { id, year } = await params;
    if (!id || !year) return { title: 'Tournament Edition' };

    const site = 'https://stats.tennismylife.org';

    // Use the shared edition info lookup so metadata and page use the same existence criteria
    const info = await fetchEditionInfo({ id, year });

    const slug = info?.tourneyRow?.slug ?? id;
    const name = info?.tourneyRow ? firstString(info.tourneyRow.name) : id;
    const display = `${humanizeName(firstString(name))} ${year}`;
    const ogUrl = `${site}/tournaments/${slug}/${year}`;

    return {
      title: { absolute: `${display} | Tournament Stats, History, Draws, Match Results & Winners - TennisMyLife` },
      description: DESCRIPTION,
      alternates: { canonical: ogUrl },
      openGraph: { url: ogUrl, title: `${display} | Tournament - TennisMyLife`, description: DESCRIPTION },
    };
  } catch (err) {
    const isHttpFallback = !!(err && typeof err === 'object' && 'digest' in err && String((err as any).digest).startsWith('NEXT_HTTP_ERROR_FALLBACK'));
    // eslint-disable-next-line no-console
    console.error('generateMetadata failed for tournament edition', { params, err, isHttpFallback, digest: (err && (err as any).digest) || null, stack: (err && (err as any).stack) || null });
    return { title: 'Tournament Edition' };
  }
}

export default function TournamentYearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
