/**
 * lib/seo/records-policy.ts
 *
 * Centralised SEO policy for /records/* pages.
 *
 * Rules
 * ──────────────────────────────────────────────────────────────────────────
 * 1. /records/*  with NO filter params  → index, follow
 * 2. 1+ filters, NOT in whitelist       → noindex, follow
 * 3. Whitelist entries (any filter count) → index, follow
 * 4. noindex pages remain crawlable     (follow is always true, never disallow)
 * 5. Whitelist entries get:
 *    • robots index, follow
 *    • self-referencing canonical (with canonical param order)
 *    • specific title / H1
 *    • inclusion in sitemap
 * 6. Non-whitelist pages with filters → excluded from sitemap
 * 7. Empty-result combinations         → caller should 404 (not handled here)
 *
 * Canonical param order: level, surface, round, bestOf, subtab
 */

/**
 * Master switch for noindex behaviour on filtered /records pages.
 * Set to true to apply rules 2–3 (only whitelisted filtered pages are indexed).
 * While false every /records page is indexed regardless of filter count.
 */
export const RECORDS_NOINDEX_ENABLED = true;

// ─── Types ────────────────────────────────────────────────────────────────────

/** The SEO-relevant filter params extracted from a URL */
export interface RecordFilters {
  /** e.g. ['M', 'G'] */
  level?: string[];
  /** e.g. ['Hard', 'Clay'] */
  surface?: string[];
  /** e.g. 'QF' */
  round?: string;
  /** e.g. 3 */
  bestOf?: number;
  /** subtab – treated as a filter for counting purposes */
  subtab?: string;
}

export interface PolicyResult {
  /** true → index, false → noindex */
  index: boolean;
  /** always true (never block crawling) */
  follow: true;
  /** whether this URL belongs to the whitelist */
  isWhitelisted: boolean;
  /** canonical URL (absolute) */
  canonical: string;
  /** filter count (0 = no filters, 1 = single, 2+ = multi) */
  filterCount: number;
  /** whether this page should appear in sitemap */
  inSitemap: boolean;
}

// ─── Canonical param order ────────────────────────────────────────────────────

const CANONICAL_PARAM_ORDER = ['level', 'surface', 'round', 'bestOf', 'subtab'] as const;

/**
 * Normalise + sort query params into canonical order.
 * Values are uppercase for level/round, title-case for surface, lowercase for subtab.
 */
export function buildCanonicalQueryString(filters: RecordFilters): string {
  const parts: string[] = [];

  const push = (key: string, values: string[]) => {
    const sorted = [...new Set(values)].sort();
    sorted.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
  };

  for (const key of CANONICAL_PARAM_ORDER) {
    switch (key) {
      case 'level':
        if (filters.level?.length) push('level', filters.level.map(v => v.toUpperCase()));
        break;
      case 'surface':
        if (filters.surface?.length)
          push('surface', filters.surface.map(v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()));
        break;
      case 'round':
        if (filters.round) parts.push(`round=${encodeURIComponent(filters.round.toUpperCase())}`);
        break;
      case 'bestOf':
        if (filters.bestOf != null) parts.push(`bestOf=${encodeURIComponent(String(filters.bestOf))}`);
        break;
      case 'subtab':
        if (filters.subtab) parts.push(`subtab=${encodeURIComponent(filters.subtab.toLowerCase())}`);
        break;
    }
  }
  return parts.join('&');
}

/**
 * Build the full canonical URL for a /records page.
 * slug = e.g. ['wins'] or ['ages', 'oldest-winners']
 */
export function buildCanonicalUrl(
  base: string,
  slug: string[],
  filters: RecordFilters,
): string {
  const path = `/records/${slug.map(encodeURIComponent).join('/')}`;
  const qs = buildCanonicalQueryString(filters);
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

// ─── Whitelist ─────────────────────────────────────────────────────────────────

/**
 * Each whitelist entry is identified by its canonical path (no origin) + sorted
 * query string.  The helper `makeWlKey` produces the same key format used at
 * runtime so comparison is always exact.
 */
interface WhitelistEntry {
  /** slug segments, e.g. ['ages', 'oldest-winners'] */
  slug: string[];
  filters: RecordFilters;
  /** Override for <title> / H1.  If omitted, the generic description is used. */
  title?: string;
}

const WHITELIST_RAW: WhitelistEntry[] = [
  // ─── wins (level) ──────────────────────────────────────────────────────────
  { slug: ['wins'], filters: { level: ['G'] }, title: 'Most Grand Slam Match Wins – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['M'] }, title: 'Most Masters 1000 Match Wins – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['F'] } },
  { slug: ['wins'], filters: { level: ['250'] } },
  { slug: ['wins'], filters: { level: ['500'] } },
  { slug: ['wins'], filters: { level: ['D'] } },

  // ─── wins (surface) ────────────────────────────────────────────────────────
  { slug: ['wins'], filters: { surface: ['Hard'] }, title: 'Most Wins on Hard Court – All-Time ATP Records' },
  { slug: ['wins'], filters: { surface: ['Clay'] }, title: 'Most Wins on Clay – All-Time ATP Records' },
  { slug: ['wins'], filters: { surface: ['Grass'] }, title: 'Most Wins on Grass – All-Time ATP Records' },
  { slug: ['wins'], filters: { surface: ['Carpet'] } },

  // ─── wins (round) ──────────────────────────────────────────────────────────
  { slug: ['wins'], filters: { round: 'QF' }, title: 'Most Quarterfinals Won – All-Time ATP Records' },
  { slug: ['wins'], filters: { round: 'SF' }, title: 'Most Semifinals Won – All-Time ATP Records' },
  { slug: ['wins'], filters: { round: 'F' } },

  // ─── wins (bestOf) ─────────────────────────────────────────────────────────
  { slug: ['wins'], filters: { bestOf: 3 } },
  { slug: ['wins'], filters: { bestOf: 5 } },

  // ─── wins (2-filter: level+round) ─────────────────────────────────────────
  { slug: ['wins'], filters: { level: ['G'], round: 'F' }, title: 'Most Grand Slam Finals Won – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['G'], round: 'SF' }, title: 'Most Grand Slam Semifinals Won – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['G'], round: 'QF' }, title: 'Most Wins in Grand Slam Quarterfinals – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['M'], round: 'QF' }, title: 'Most Wins in Masters 1000 Quarterfinals – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['M'], round: 'F' }, title: 'Most Masters 1000 Finals Won – All-Time ATP Records' },

  // ─── wins (2-filter: level+surface) ───────────────────────────────────────
  { slug: ['wins'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Match Wins at Roland Garros – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Match Wins at Wimbledon – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Match Wins at Hard Court Grand Slams – All-Time ATP Records' },
  { slug: ['wins'], filters: { level: ['M'], surface: ['Hard'] } },
  { slug: ['wins'], filters: { level: ['M'], surface: ['Clay'] } },

  // ─── wins (3-filter: bestOf+level+surface) ────────────────────────────────
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Clay'] } },
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Hard'] } },
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Carpet'] } },

  // ─── played (level) ────────────────────────────────────────────────────────
  { slug: ['played'], filters: { level: ['G'] }, title: 'Most Matches Played at Grand Slams – All-Time ATP Records' },
  { slug: ['played'], filters: { level: ['M'] }, title: 'Most Matches Played at Masters 1000 – All-Time Records' },
  { slug: ['played'], filters: { level: ['F'] }, title: 'Most Matches Played at ATP Finals – All-Time Records' },
  { slug: ['played'], filters: { level: ['250'] } },
  { slug: ['played'], filters: { level: ['500'] } },
  { slug: ['played'], filters: { level: ['D'] } },

  // ─── played (surface) ──────────────────────────────────────────────────────
  { slug: ['played'], filters: { surface: ['Hard'] } },
  { slug: ['played'], filters: { surface: ['Clay'] } },
  { slug: ['played'], filters: { surface: ['Grass'] } },
  { slug: ['played'], filters: { surface: ['Carpet'] } },

  // ─── played (round) ────────────────────────────────────────────────────────
  { slug: ['played'], filters: { round: 'QF' } },
  { slug: ['played'], filters: { round: 'SF' } },
  { slug: ['played'], filters: { round: 'F' }, title: 'Most Finals Played – ATP All-Time Records' },

  // ─── played (bestOf) ───────────────────────────────────────────────────────
  { slug: ['played'], filters: { bestOf: 3 } },
  { slug: ['played'], filters: { bestOf: 5 } },

  // ─── played (2-filter: level+surface) ─────────────────────────────────────
  { slug: ['played'], filters: { level: ['G'], surface: ['Hard'] } },
  { slug: ['played'], filters: { level: ['G'], surface: ['Clay'] } },
  { slug: ['played'], filters: { level: ['G'], surface: ['Grass'] } },
  { slug: ['played'], filters: { level: ['M'], surface: ['Hard'] } },
  { slug: ['played'], filters: { level: ['M'], surface: ['Clay'] } },
  { slug: ['played'], filters: { level: ['M'], surface: ['Carpet'] } },

  // ─── played (3-filter: bestOf+level+surface) ──────────────────────────────
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Clay'] } },
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Hard'] } },
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Carpet'] } },

  // ─── count (level) ─────────────────────────────────────────────────────────
  { slug: ['count'], filters: { level: ['G'] } },
  { slug: ['count'], filters: { level: ['M'] } },
  { slug: ['count'], filters: { level: ['F'] } },
  { slug: ['count'], filters: { level: ['250'] } },
  { slug: ['count'], filters: { level: ['500'] } },

  // ─── count (round) ─────────────────────────────────────────────────────────
  { slug: ['count'], filters: { round: 'QF' } },
  { slug: ['count'], filters: { round: 'SF' } },
  { slug: ['count'], filters: { round: 'F' } },

  // ─── count (2-filter: level+round) ────────────────────────────────────────
  { slug: ['count'], filters: { level: ['G'], round: 'QF' }, title: 'Most Grand Slam Quarterfinals – All-Time ATP Records' },
  { slug: ['count'], filters: { level: ['G'], round: 'SF' }, title: 'Most Grand Slam Semifinal Appearances – All-Time ATP Records' },
  { slug: ['count'], filters: { level: ['G'], round: 'F' }, title: 'Most Grand Slam Final Appearances – All-Time ATP Records' },
  { slug: ['count'], filters: { level: ['M'], round: 'QF' }, title: 'Most Masters 1000 Quarterfinals – All-Time ATP Records' },
  { slug: ['count'], filters: { level: ['M'], round: 'F' }, title: 'Most Masters 1000 Final Appearances – All-Time ATP Records' },

  // ─── titles (level) ────────────────────────────────────────────────────────
  { slug: ['titles'], filters: { level: ['G'] }, title: 'Most Grand Slam Titles – All-Time ATP Records' },
  { slug: ['titles'], filters: { level: ['M'] }, title: 'Most Masters 1000 Titles – All-Time ATP Records' },
  { slug: ['titles'], filters: { level: ['F'] }, title: 'Most ATP Finals Titles – All-Time Records' },
  { slug: ['titles'], filters: { level: ['250'] } },
  { slug: ['titles'], filters: { level: ['500'] } },

  // ─── titles (surface) ──────────────────────────────────────────────────────
  { slug: ['titles'], filters: { surface: ['Hard'] }, title: 'Most Titles Won on Hard Court – All-Time ATP Records' },
  { slug: ['titles'], filters: { surface: ['Clay'] }, title: 'Most Titles Won on Clay – All-Time ATP Records' },
  { slug: ['titles'], filters: { surface: ['Grass'] }, title: 'Most Titles Won on Grass – All-Time ATP Records' },
  { slug: ['titles'], filters: { surface: ['Carpet'] } },

  // ─── titles (2-filter: level+surface) ─────────────────────────────────────
  { slug: ['titles'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Roland Garros Titles – All-Time ATP Records' },
  { slug: ['titles'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Wimbledon Titles – All-Time ATP Records' },
  { slug: ['titles'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Hard Court Grand Slam Titles – All-Time ATP Records' },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Hard'] } },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Clay'] } },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Carpet'] } },

  // ─── entries (level) ───────────────────────────────────────────────────────
  { slug: ['entries'], filters: { level: ['G'] }, title: 'Most Grand Slam Appearances – All-Time ATP Records' },
  { slug: ['entries'], filters: { level: ['M'] }, title: 'Most Masters 1000 Appearances – All-Time ATP Records' },
  { slug: ['entries'], filters: { level: ['F'] } },
  { slug: ['entries'], filters: { level: ['250'] } },
  { slug: ['entries'], filters: { level: ['500'] } },

  // ─── entries (surface) ─────────────────────────────────────────────────────
  { slug: ['entries'], filters: { surface: ['Hard'] } },
  { slug: ['entries'], filters: { surface: ['Clay'] } },
  { slug: ['entries'], filters: { surface: ['Grass'] } },
  { slug: ['entries'], filters: { surface: ['Carpet'] } },

  // ─── entries (2-filter: level+surface) ────────────────────────────────────
  { slug: ['entries'], filters: { level: ['G'], surface: ['Hard'] } },
  { slug: ['entries'], filters: { level: ['G'], surface: ['Clay'] } },
  { slug: ['entries'], filters: { level: ['G'], surface: ['Grass'] } },
  { slug: ['entries'], filters: { level: ['M'], surface: ['Hard'] } },
  { slug: ['entries'], filters: { level: ['M'], surface: ['Carpet'] } },

  // ─── percentage (level) ────────────────────────────────────────────────────
  { slug: ['percentage'], filters: { level: ['G'] }, title: 'Best Win Percentage at Grand Slams – All-Time ATP Records' },
  { slug: ['percentage'], filters: { level: ['M'] }, title: 'Best Win Percentage at Masters 1000 – All-Time ATP Records' },
  { slug: ['percentage'], filters: { level: ['F'] } },
  { slug: ['percentage'], filters: { level: ['250'] } },
  { slug: ['percentage'], filters: { level: ['500'] } },

  // ─── percentage (surface) ──────────────────────────────────────────────────
  { slug: ['percentage'], filters: { surface: ['Hard'] }, title: 'Best Win Percentage on Hard Court – All-Time ATP Records' },
  { slug: ['percentage'], filters: { surface: ['Clay'] }, title: 'Best Win Percentage on Clay – All-Time ATP Records' },
  { slug: ['percentage'], filters: { surface: ['Grass'] }, title: 'Best Win Percentage on Grass – All-Time ATP Records' },
  { slug: ['percentage'], filters: { surface: ['Carpet'] } },

  // ─── percentage (round) ────────────────────────────────────────────────────
  { slug: ['percentage'], filters: { round: 'QF' } },
  { slug: ['percentage'], filters: { round: 'SF' } },
  { slug: ['percentage'], filters: { round: 'F' } },

  // ─── percentage (2-filter: level+surface) ─────────────────────────────────
  { slug: ['percentage'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Best Win Percentage at Roland Garros – All-Time ATP Records' },
  { slug: ['percentage'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Best Win Percentage at Wimbledon – All-Time ATP Records' },

  // ─── ages/oldest (level) ───────────────────────────────────────────────────
  { slug: ['ages', 'oldest'], filters: { level: ['G'] } },
  { slug: ['ages', 'oldest'], filters: { level: ['M'] } },
  { slug: ['ages', 'oldest'], filters: { level: ['F'] } },
  { slug: ['ages', 'oldest'], filters: { level: ['250'] } },
  { slug: ['ages', 'oldest'], filters: { level: ['500'] } },
  { slug: ['ages', 'oldest'], filters: { level: ['D'] } },

  // ─── ages/oldest (surface) ─────────────────────────────────────────────────
  { slug: ['ages', 'oldest'], filters: { surface: ['Hard'] } },
  { slug: ['ages', 'oldest'], filters: { surface: ['Clay'] } },
  { slug: ['ages', 'oldest'], filters: { surface: ['Grass'] } },
  { slug: ['ages', 'oldest'], filters: { surface: ['Carpet'] } },

  // ─── ages/oldest (round) ───────────────────────────────────────────────────
  { slug: ['ages', 'oldest'], filters: { round: 'QF' } },
  { slug: ['ages', 'oldest'], filters: { round: 'SF' } },
  { slug: ['ages', 'oldest'], filters: { round: 'F' } },

  // ─── ages/youngest (level) ─────────────────────────────────────────────────
  { slug: ['ages', 'youngest'], filters: { level: ['G'] } },
  { slug: ['ages', 'youngest'], filters: { level: ['M'] } },
  { slug: ['ages', 'youngest'], filters: { level: ['F'] } },
  { slug: ['ages', 'youngest'], filters: { level: ['250'] } },
  { slug: ['ages', 'youngest'], filters: { level: ['500'] } },
  { slug: ['ages', 'youngest'], filters: { level: ['D'] } },

  // ─── ages/youngest (surface) ───────────────────────────────────────────────
  { slug: ['ages', 'youngest'], filters: { surface: ['Hard'] } },
  { slug: ['ages', 'youngest'], filters: { surface: ['Clay'] } },
  { slug: ['ages', 'youngest'], filters: { surface: ['Grass'] } },
  { slug: ['ages', 'youngest'], filters: { surface: ['Carpet'] } },

  // ─── ages/youngest (round) ─────────────────────────────────────────────────
  { slug: ['ages', 'youngest'], filters: { round: 'QF' } },
  { slug: ['ages', 'youngest'], filters: { round: 'SF' } },
  { slug: ['ages', 'youngest'], filters: { round: 'F' } },

  // ─── ages/oldest-winners (level) ───────────────────────────────────────────
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'] }, title: 'Oldest Grand Slam Title Winners – All-Time ATP Records' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'] } },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'] }, title: 'Oldest ATP Finals Title Winners of All Time' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'] } },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'] } },

  // ─── ages/oldest-winners (surface) ────────────────────────────────────────
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Hard'] } },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Clay'] } },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Grass'] } },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Carpet'] } },

  // ─── ages/youngest-winners (level) ────────────────────────────────────────
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'] }, title: 'Youngest Grand Slam Title Winners – All-Time ATP Records' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'] }, title: 'Youngest Masters 1000 Title Winners of All Time' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'] } },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'] } },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'] } },

  // ─── ages/youngest-winners (surface) ──────────────────────────────────────
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Hard'] } },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Clay'] } },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Grass'] }, title: 'Youngest Grass Court Title Winners – All-Time ATP Records' },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Carpet'] } },

  // ─── timespan/entries (level) ──────────────────────────────────────────────
  { slug: ['timespan', 'entries'], filters: { level: ['G'] } },
  { slug: ['timespan', 'entries'], filters: { level: ['M'] } },
  { slug: ['timespan', 'entries'], filters: { level: ['F'] } },
  { slug: ['timespan', 'entries'], filters: { level: ['250'] } },
  { slug: ['timespan', 'entries'], filters: { level: ['500'] } },

  // ─── timespan/entries (surface) ────────────────────────────────────────────
  { slug: ['timespan', 'entries'], filters: { surface: ['Hard'] } },
  { slug: ['timespan', 'entries'], filters: { surface: ['Clay'] } },
  { slug: ['timespan', 'entries'], filters: { surface: ['Grass'] } },
  { slug: ['timespan', 'entries'], filters: { surface: ['Carpet'] } },

  // ─── timespan/titles (level) ───────────────────────────────────────────────
  { slug: ['timespan', 'titles'], filters: { level: ['G'] }, title: 'Longest Gap Between Two Grand Slam Titles – All-Time ATP Records' },
  { slug: ['timespan', 'titles'], filters: { level: ['M'] } },
  { slug: ['timespan', 'titles'], filters: { level: ['F'] } },
  { slug: ['timespan', 'titles'], filters: { level: ['250'] } },
  { slug: ['timespan', 'titles'], filters: { level: ['500'] } },

  // ─── timespan/titles (surface) ─────────────────────────────────────────────
  { slug: ['timespan', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['timespan', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['timespan', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['timespan', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── timespan/rounds (round) ───────────────────────────────────────────────
  { slug: ['timespan', 'rounds'], filters: { round: 'QF' } },
  { slug: ['timespan', 'rounds'], filters: { round: 'SF' } },
  { slug: ['timespan', 'rounds'], filters: { round: 'F' } },

  // ─── timespan (round) — base route with round filter ──────────────────────
  { slug: ['timespan'], filters: { round: 'QF' } },
  { slug: ['timespan'], filters: { round: 'SF' } },
  { slug: ['timespan'], filters: { round: 'F' } },

  // ─── roundsonentries (level) ───────────────────────────────────────────────
  { slug: ['roundsonentries'], filters: { level: ['G'] } },
  { slug: ['roundsonentries'], filters: { level: ['M'] } },
  { slug: ['roundsonentries'], filters: { level: ['F'] } },
  { slug: ['roundsonentries'], filters: { level: ['250'] } },
  { slug: ['roundsonentries'], filters: { level: ['500'] } },

  // ─── roundsonentries/titles (level) ────────────────────────────────────────
  { slug: ['roundsonentries', 'titles'], filters: { level: ['G'] } },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['M'] } },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['F'] } },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['250'] } },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['500'] } },

  // ─── roundsonentries/titles (surface) ─────────────────────────────────────
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── roundsonentries/round (level) ────────────────────────────────────────
  { slug: ['roundsonentries', 'round'], filters: { level: ['G'] } },
  { slug: ['roundsonentries', 'round'], filters: { level: ['M'] } },
  { slug: ['roundsonentries', 'round'], filters: { level: ['F'] } },
  { slug: ['roundsonentries', 'round'], filters: { level: ['250'] } },
  { slug: ['roundsonentries', 'round'], filters: { level: ['500'] } },

  // ─── roundsonentries/round (round) ────────────────────────────────────────
  { slug: ['roundsonentries', 'round'], filters: { round: 'QF' } },
  { slug: ['roundsonentries', 'round'], filters: { round: 'SF' } },
  { slug: ['roundsonentries', 'round'], filters: { round: 'F' } },

  // ─── same/wins ─────────────────────────────────────────────────────────────
  { slug: ['same', 'wins'], filters: { level: ['G'] } },
  { slug: ['same', 'wins'], filters: { level: ['M'] } },
  { slug: ['same', 'wins'], filters: { level: ['F'] } },
  { slug: ['same', 'wins'], filters: { level: ['250'] } },
  { slug: ['same', 'wins'], filters: { level: ['500'] } },
  { slug: ['same', 'wins'], filters: { surface: ['Hard'] } },
  { slug: ['same', 'wins'], filters: { surface: ['Clay'] } },
  { slug: ['same', 'wins'], filters: { surface: ['Grass'] } },
  { slug: ['same', 'wins'], filters: { surface: ['Carpet'] } },
  { slug: ['same', 'wins'], filters: { bestOf: 3 } },
  { slug: ['same', 'wins'], filters: { bestOf: 5 } },

  // ─── same/played ───────────────────────────────────────────────────────────
  { slug: ['same', 'played'], filters: { level: ['G'] } },
  { slug: ['same', 'played'], filters: { level: ['M'] } },
  { slug: ['same', 'played'], filters: { level: ['F'] } },
  { slug: ['same', 'played'], filters: { level: ['250'] } },
  { slug: ['same', 'played'], filters: { level: ['500'] } },
  { slug: ['same', 'played'], filters: { surface: ['Hard'] } },
  { slug: ['same', 'played'], filters: { surface: ['Clay'] } },
  { slug: ['same', 'played'], filters: { surface: ['Grass'] } },
  { slug: ['same', 'played'], filters: { surface: ['Carpet'] } },
  { slug: ['same', 'played'], filters: { bestOf: 3 } },
  { slug: ['same', 'played'], filters: { bestOf: 5 } },

  // ─── same/entries ──────────────────────────────────────────────────────────
  { slug: ['same', 'entries'], filters: { level: ['G'] } },
  { slug: ['same', 'entries'], filters: { level: ['M'] } },
  { slug: ['same', 'entries'], filters: { level: ['F'] } },
  { slug: ['same', 'entries'], filters: { level: ['250'] } },
  { slug: ['same', 'entries'], filters: { level: ['500'] } },
  { slug: ['same', 'entries'], filters: { surface: ['Hard'] } },
  { slug: ['same', 'entries'], filters: { surface: ['Clay'] } },
  { slug: ['same', 'entries'], filters: { surface: ['Grass'] } },
  { slug: ['same', 'entries'], filters: { surface: ['Carpet'] } },

  // ─── same/titles ───────────────────────────────────────────────────────────
  { slug: ['same', 'titles'], filters: { level: ['G'] } },
  { slug: ['same', 'titles'], filters: { level: ['M'] } },
  { slug: ['same', 'titles'], filters: { level: ['F'] } },
  { slug: ['same', 'titles'], filters: { level: ['250'] } },
  { slug: ['same', 'titles'], filters: { level: ['500'] } },
  { slug: ['same', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['same', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['same', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['same', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── same/round ────────────────────────────────────────────────────────────
  { slug: ['same', 'round'], filters: { level: ['G'] } },
  { slug: ['same', 'round'], filters: { level: ['M'] } },
  { slug: ['same', 'round'], filters: { level: ['F'] } },
  { slug: ['same', 'round'], filters: { level: ['250'] } },
  { slug: ['same', 'round'], filters: { level: ['500'] } },
  { slug: ['same', 'round'], filters: { round: 'QF' } },
  { slug: ['same', 'round'], filters: { round: 'SF' } },
  { slug: ['same', 'round'], filters: { round: 'F' } },

  // ─── seasons/wins ──────────────────────────────────────────────────────────
  { slug: ['seasons', 'wins'], filters: { level: ['G'] }, title: 'Most Grand Slam Match Wins in a Single Season – All-Time ATP Records' },
  { slug: ['seasons', 'wins'], filters: { level: ['M'] } },
  { slug: ['seasons', 'wins'], filters: { level: ['F'] } },
  { slug: ['seasons', 'wins'], filters: { level: ['250'] } },
  { slug: ['seasons', 'wins'], filters: { level: ['500'] } },
  { slug: ['seasons', 'wins'], filters: { surface: ['Hard'] } },
  { slug: ['seasons', 'wins'], filters: { surface: ['Clay'] } },
  { slug: ['seasons', 'wins'], filters: { surface: ['Grass'] } },
  { slug: ['seasons', 'wins'], filters: { surface: ['Carpet'] } },
  { slug: ['seasons', 'wins'], filters: { bestOf: 3 } },
  { slug: ['seasons', 'wins'], filters: { bestOf: 5 } },

  // ─── seasons/played ────────────────────────────────────────────────────────
  { slug: ['seasons', 'played'], filters: { level: ['G'] } },
  { slug: ['seasons', 'played'], filters: { level: ['M'] } },
  { slug: ['seasons', 'played'], filters: { level: ['F'] } },
  { slug: ['seasons', 'played'], filters: { level: ['250'] } },
  { slug: ['seasons', 'played'], filters: { level: ['500'] } },
  { slug: ['seasons', 'played'], filters: { level: ['D'] } },
  { slug: ['seasons', 'played'], filters: { surface: ['Hard'] } },
  { slug: ['seasons', 'played'], filters: { surface: ['Clay'] } },
  { slug: ['seasons', 'played'], filters: { surface: ['Grass'] } },
  { slug: ['seasons', 'played'], filters: { surface: ['Carpet'] } },
  { slug: ['seasons', 'played'], filters: { bestOf: 3 } },
  { slug: ['seasons', 'played'], filters: { bestOf: 5 } },

  // ─── seasons/entries ───────────────────────────────────────────────────────
  { slug: ['seasons', 'entries'], filters: { level: ['G'] } },
  { slug: ['seasons', 'entries'], filters: { level: ['M'] } },
  { slug: ['seasons', 'entries'], filters: { level: ['F'] } },
  { slug: ['seasons', 'entries'], filters: { level: ['250'] } },
  { slug: ['seasons', 'entries'], filters: { level: ['500'] } },
  { slug: ['seasons', 'entries'], filters: { surface: ['Hard'] } },
  { slug: ['seasons', 'entries'], filters: { surface: ['Clay'] } },
  { slug: ['seasons', 'entries'], filters: { surface: ['Grass'] } },
  { slug: ['seasons', 'entries'], filters: { surface: ['Carpet'] } },
  { slug: ['seasons', 'entries'], filters: { bestOf: 3 } },
  { slug: ['seasons', 'entries'], filters: { bestOf: 5 } },

  // ─── seasons/titles ────────────────────────────────────────────────────────
  { slug: ['seasons', 'titles'], filters: { level: ['G'] }, title: 'Most Grand Slam Titles in a Single Season – All-Time ATP Records' },
  { slug: ['seasons', 'titles'], filters: { level: ['M'] } },
  { slug: ['seasons', 'titles'], filters: { level: ['F'] } },
  { slug: ['seasons', 'titles'], filters: { level: ['250'] } },
  { slug: ['seasons', 'titles'], filters: { level: ['500'] } },
  { slug: ['seasons', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['seasons', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['seasons', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['seasons', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── seasons/round ─────────────────────────────────────────────────────────
  { slug: ['seasons', 'round'], filters: { round: 'QF' } },
  { slug: ['seasons', 'round'], filters: { round: 'SF' } },
  { slug: ['seasons', 'round'], filters: { round: 'F' } },

  // ─── seasons/percentage ────────────────────────────────────────────────────
  { slug: ['seasons', 'percentage'], filters: { level: ['G'] } },
  { slug: ['seasons', 'percentage'], filters: { level: ['M'] } },
  { slug: ['seasons', 'percentage'], filters: { level: ['F'] } },
  { slug: ['seasons', 'percentage'], filters: { level: ['250'] } },
  { slug: ['seasons', 'percentage'], filters: { level: ['500'] } },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Hard'] } },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Clay'] } },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Grass'] } },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Carpet'] } },
  { slug: ['seasons', 'percentage'], filters: { round: 'QF' } },
  { slug: ['seasons', 'percentage'], filters: { round: 'SF' } },
  { slug: ['seasons', 'percentage'], filters: { round: 'F' } },
  { slug: ['seasons', 'percentage'], filters: { bestOf: 3 } },
  { slug: ['seasons', 'percentage'], filters: { bestOf: 5 } },

  // ─── atage/wins ────────────────────────────────────────────────────────────
  { slug: ['atage', 'wins'], filters: { surface: ['Hard'] } },
  { slug: ['atage', 'wins'], filters: { surface: ['Clay'] } },
  { slug: ['atage', 'wins'], filters: { surface: ['Grass'] } },
  { slug: ['atage', 'wins'], filters: { surface: ['Carpet'] } },

  // ─── atage/played ──────────────────────────────────────────────────────────
  { slug: ['atage', 'played'], filters: { surface: ['Hard'] } },
  { slug: ['atage', 'played'], filters: { surface: ['Clay'] } },
  { slug: ['atage', 'played'], filters: { surface: ['Grass'] } },
  { slug: ['atage', 'played'], filters: { surface: ['Carpet'] } },

  // ─── atage/entries ─────────────────────────────────────────────────────────
  { slug: ['atage', 'entries'], filters: { surface: ['Hard'] } },
  { slug: ['atage', 'entries'], filters: { surface: ['Clay'] } },
  { slug: ['atage', 'entries'], filters: { surface: ['Grass'] } },
  { slug: ['atage', 'entries'], filters: { surface: ['Carpet'] } },

  // ─── atage/titles ──────────────────────────────────────────────────────────
  { slug: ['atage', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['atage', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['atage', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['atage', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── ageofnth/wins ─────────────────────────────────────────────────────────
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Hard'] } },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Clay'] } },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Grass'] } },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Carpet'] } },

  // ─── ageofnth/played ───────────────────────────────────────────────────────
  { slug: ['ageofnth', 'played'], filters: { surface: ['Hard'] } },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Clay'] } },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Grass'] } },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Carpet'] } },

  // ─── ageofnth/entries ──────────────────────────────────────────────────────
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Hard'] } },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Clay'] } },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Grass'] } },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Carpet'] } },

  // ─── ageofnth/titles ───────────────────────────────────────────────────────
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── neededto/titles ───────────────────────────────────────────────────────
  { slug: ['neededto', 'titles'], filters: { level: ['G'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['M'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['F'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['250'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['500'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── counterseasons/wins ───────────────────────────────────────────────────
  { slug: ['counterseasons', 'wins'], filters: { level: ['G'] } },
  { slug: ['counterseasons', 'wins'], filters: { level: ['M'] } },
  { slug: ['counterseasons', 'wins'], filters: { level: ['F'] } },
  { slug: ['counterseasons', 'wins'], filters: { level: ['250'] } },
  { slug: ['counterseasons', 'wins'], filters: { level: ['500'] } },
  { slug: ['counterseasons', 'wins'], filters: { level: ['D'] } },
  { slug: ['counterseasons', 'wins'], filters: { surface: ['Hard'] } },
  { slug: ['counterseasons', 'wins'], filters: { surface: ['Clay'] } },
  { slug: ['counterseasons', 'wins'], filters: { surface: ['Grass'] } },
  { slug: ['counterseasons', 'wins'], filters: { surface: ['Carpet'] } },
  { slug: ['counterseasons', 'wins'], filters: { round: 'QF' } },
  { slug: ['counterseasons', 'wins'], filters: { round: 'SF' } },
  { slug: ['counterseasons', 'wins'], filters: { round: 'F' } },
  { slug: ['counterseasons', 'wins'], filters: { bestOf: 3 } },
  { slug: ['counterseasons', 'wins'], filters: { bestOf: 5 } },

  // ─── counterseasons/titles ─────────────────────────────────────────────────
  { slug: ['counterseasons', 'titles'], filters: { level: ['G'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['M'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['250'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['500'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Carpet'] } },

  // ─── counterseasons/round ──────────────────────────────────────────────────
  { slug: ['counterseasons', 'round'], filters: { round: 'QF' } },
  { slug: ['counterseasons', 'round'], filters: { round: 'SF' } },
  { slug: ['counterseasons', 'round'], filters: { round: 'F' } },

  // ─── h2h/count ─────────────────────────────────────────────────────────────
  { slug: ['h2h', 'count'], filters: { level: ['G'] } },
  { slug: ['h2h', 'count'], filters: { level: ['M'] } },
  { slug: ['h2h', 'count'], filters: { level: ['F'] } },
  { slug: ['h2h', 'count'], filters: { level: ['250'] } },
  { slug: ['h2h', 'count'], filters: { level: ['500'] } },
  { slug: ['h2h', 'count'], filters: { level: ['D'] } },
  { slug: ['h2h', 'count'], filters: { surface: ['Hard'] } },
  { slug: ['h2h', 'count'], filters: { surface: ['Clay'] } },
  { slug: ['h2h', 'count'], filters: { surface: ['Grass'] } },
  { slug: ['h2h', 'count'], filters: { surface: ['Carpet'] } },
  { slug: ['h2h', 'count'], filters: { round: 'QF' } },
  { slug: ['h2h', 'count'], filters: { round: 'SF' } },
  { slug: ['h2h', 'count'], filters: { round: 'F' } },
  { slug: ['h2h', 'count'], filters: { bestOf: 3 } },
  { slug: ['h2h', 'count'], filters: { bestOf: 5 } },

  // ─── streak/wins ───────────────────────────────────────────────────────────
  { slug: ['streak', 'wins'], filters: { level: ['G'] }, title: 'Longest Winning Streak at Grand Slams – All-Time ATP Records' },
  { slug: ['streak', 'wins'], filters: { level: ['M'] }, title: 'Longest Winning Streak at Masters 1000 – All-Time ATP Records' },
  { slug: ['streak', 'wins'], filters: { level: ['F'] } },
  { slug: ['streak', 'wins'], filters: { level: ['250'] } },
  { slug: ['streak', 'wins'], filters: { level: ['500'] } },
  { slug: ['streak', 'wins'], filters: { level: ['D'] } },
  { slug: ['streak', 'wins'], filters: { surface: ['Hard'] }, title: 'Longest Winning Streak on Hard Court – All-Time ATP Records' },
  { slug: ['streak', 'wins'], filters: { surface: ['Clay'] }, title: 'Longest Winning Streak on Clay – All-Time ATP Records' },
  { slug: ['streak', 'wins'], filters: { surface: ['Grass'] }, title: 'Longest Winning Streak on Grass – All-Time ATP Records' },
  { slug: ['streak', 'wins'], filters: { surface: ['Carpet'] } },
  { slug: ['streak', 'wins'], filters: { round: 'QF' } },
  { slug: ['streak', 'wins'], filters: { round: 'SF' } },
  { slug: ['streak', 'wins'], filters: { round: 'F' } },
  { slug: ['streak', 'wins'], filters: { bestOf: 3 } },
  { slug: ['streak', 'wins'], filters: { bestOf: 5 } },

  // ─── streak/round ──────────────────────────────────────────────────────────
  { slug: ['streak', 'round'], filters: { round: 'QF' } },
  { slug: ['streak', 'round'], filters: { round: 'SF' } },
  { slug: ['streak', 'round'], filters: { round: 'F' } },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'QF' } },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'SF' } },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'F' } },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'QF' } },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'SF' } },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'F' } },
];

/** Stable lookup key: `/records/<slug>?<canonical-qs>` */
function makeWlKey(slug: string[], filters: RecordFilters): string {
  const qs = buildCanonicalQueryString(filters);
  return `/records/${slug.join('/')}${qs ? `?${qs}` : ''}`;
}

/** Map from key → entry for O(1) lookup */
const WHITELIST_MAP = new Map<string, WhitelistEntry>(
  WHITELIST_RAW.map(e => [makeWlKey(e.slug, e.filters), e]),
);

/** All whitelist keys (useful for sitemap generation) */
export const WHITELIST_KEYS: readonly string[] = [...WHITELIST_MAP.keys()];

/** Exported for use in sitemap.ts */
export const WHITELIST_ENTRIES: readonly WhitelistEntry[] = WHITELIST_RAW;

// ─── Filter counting ──────────────────────────────────────────────────────────

/**
 * Count the number of independent filter dimensions that are active.
 * Each key (level, surface, round, bestOf) counts as 1 regardless of how
 * many values it carries.  `subtab` is NOT counted as a filter because it is
 * a navigation dimension, not a data filter.
 */
export function countFilters(filters: RecordFilters): number {
  let n = 0;
  if (filters.level?.length) n++;
  if (filters.surface?.length) n++;
  if (filters.round) n++;
  if (filters.bestOf != null) n++;
  return n;
}

// ─── Policy evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate the SEO policy for a /records page.
 *
 * @param siteOrigin  e.g. 'https://stats.tennismylife.org'
 * @param slug        path segments after /records/, e.g. ['wins'] or ['ages','oldest-winners']
 * @param filters     active query-param filters
 */
export function evaluateRecordsPolicy(
  siteOrigin: string,
  slug: string[],
  filters: RecordFilters,
): PolicyResult {
  const filterCount = countFilters(filters);
  const canonical = buildCanonicalUrl(siteOrigin, slug, filters);

  // Whitelist lookup uses the path without origin
  const lookupKey = makeWlKey(slug, filters);
  const wlEntry = WHITELIST_MAP.get(lookupKey);
  const isWhitelisted = wlEntry !== undefined;

  // Index rule:
  //  · RECORDS_NOINDEX_ENABLED = false → index everything
  //  · 0 filters    → always index (no-filter pages)
  //  · 1+ filters   → noindex unless whitelisted
  const shouldIndex = !RECORDS_NOINDEX_ENABLED || filterCount === 0 || isWhitelisted;

  return {
    index: shouldIndex,
    follow: true,
    isWhitelisted,
    canonical,
    filterCount,
    inSitemap: filterCount === 0 || isWhitelisted,
  };
}

// ─── Title helper ─────────────────────────────────────────────────────────────

/**
 * Return the SEO title for a /records page.
 * Whitelist entries use their curated title; all others use the generated description.
 */
export function getRecordsPageTitle(
  slug: string[],
  filters: RecordFilters,
  generatedDescription: string,
): string {
  const base = generatedDescription || slug.join(' / ');
  return `${base} | Tennis Records`;
}

// ─── Robots meta helper ───────────────────────────────────────────────────────

/**
 * Returns the Next.js `robots` metadata object for a /records page.
 * noindex pages keep follow=true so Googlebot can still crawl links.
 */
export function getRecordsRobotsMeta(policy: PolicyResult): {
  index: boolean;
  follow: boolean;
  googleBot?: { index: boolean; follow: boolean };
} {
  return {
    index: policy.index,
    follow: policy.follow,
    googleBot: { index: policy.index, follow: policy.follow },
  };
}

// ─── Sitemap entries helper ───────────────────────────────────────────────────

/**
 * Generate the set of /records paths with query strings that must be included
 * in the sitemap (base paths + whitelisted filtered pages).
 *
 * Base paths (no filters) that are already in the static `staticRoutes` array
 * inside sitemap.ts are listed here for reference but the caller should
 * de-duplicate.
 */
export function getWhitelistedSitemapPaths(siteOrigin: string): string[] {
  return WHITELIST_RAW.map(e => {
    const qs = buildCanonicalQueryString(e.filters);
    const path = `/records/${e.slug.join('/')}`;
    return qs ? `${path}?${qs}` : path;
  });
}
