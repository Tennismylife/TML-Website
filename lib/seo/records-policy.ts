/**
 * lib/seo/records-policy.ts
 *
 * Centralised SEO policy for /records/* pages.
 *
 * Rules
 * --------------------------------------------------------------------------
 * 1. /records/*  with NO filter params  ? index, follow
 * 2. 1+ filters, NOT in whitelist       ? noindex, follow
 * 3. Whitelist entries (any filter count) ? index, follow
 * 4. noindex pages remain crawlable     (follow is always true, never disallow)
 * 5. Whitelist entries get:
 *    • robots index, follow
 *    • self-referencing canonical (with canonical param order)
 *    • specific title / H1
 *    • inclusion in sitemap
 * 6. Non-whitelist pages with filters ? excluded from sitemap
 * 7. Empty-result combinations         ? caller should 404 (not handled here)
 *
 * Canonical param order: level, surface, round, bestOf, subtab
 */

/**
 * Master switch for noindex behaviour on filtered /records pages.
 * Set to true to apply rules 2–3 (only whitelisted filtered pages are indexed).
 * While false every /records page is indexed regardless of filter count.
 */
export const RECORDS_NOINDEX_ENABLED = true;

// --- Types --------------------------------------------------------------------

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
  /** true ? index, false ? noindex */
  index: boolean;
  /** always true — noindex pages remain crawlable so Google can follow links to whitelisted pages */
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

// --- Canonical param order ----------------------------------------------------

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
  const aliasEntry = CANONICAL_ALIAS_MAP.get(makeWlKey(slug, filters));
  if (aliasEntry?.canonicalPath) {
    return `${base}${aliasEntry.canonicalPath}`;
  }

  const wlEntry = WHITELIST_MAP.get(makeWlKey(slug, filters));
  if (wlEntry) {
    return `${base}${buildWhitelistCanonicalPath(wlEntry)}`;
  }

  const path = `/records/${slug.map(encodeURIComponent).join('/')}`;
  const qs = buildCanonicalQueryString(filters);
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

export function getCanonicalPathForWhitelistEntry(slug: string[], filters: RecordFilters): string | null {
  const entry = WHITELIST_MAP.get(makeWlKey(slug, filters));
  return entry ? buildWhitelistCanonicalPath(entry) : null;
}

export function getCanonicalPathForAliasEntry(slug: string[], filters: RecordFilters): string | null {
  const entry = CANONICAL_ALIAS_MAP.get(makeWlKey(slug, filters));
  return entry?.canonicalPath ?? null;
}

export function getWhitelistEntryByCanonicalPath(path: string): WhitelistEntry | undefined {
  return WHITELIST_CANONICAL_PATH_MAP.get(path);
}

export function getCanonicalAliasEntryByCanonicalPath(path: string): WhitelistEntry | undefined {
  return CANONICAL_ALIAS_MAP_BY_CANONICAL_PATH.get(path);
}

/**
 * Returns the explicit `canonicalPath` for a whitelist entry only when it is
 * hard-coded on the entry itself (not derived from `title`).  Use this for
 * base-path redirects so that title-only entries (e.g. /records/wins) are
 * not incorrectly redirected to their auto-generated canonical slug.
 */
export function getExplicitCanonicalPathForWhitelistEntry(slug: string[], filters: RecordFilters): string | null {
  const entry = WHITELIST_MAP.get(makeWlKey(slug, filters));
  return entry?.canonicalPath ?? null;
}

// --- Whitelist -----------------------------------------------------------------

/**
 * Each whitelist entry is identified by its canonical path (no origin) + sorted
 * query string.  The helper `makeWlKey` produces the same key format used at
 * runtime so comparison is always exact.
 */
export interface WhitelistEntry {
  /** slug segments, e.g. ['ages', 'oldest-winners'] */
  slug: string[];
  filters: RecordFilters;
  /** Override for <title> / H1.  If omitted, the generic description is used. */
  title?: string;
  /** Optional explicit canonical path for title-driven entries. */
  canonicalPath?: string;
}

function normalizeFilterValue(key: string, value: string): string {
  switch (key) {
    case 'level':
      return value.toUpperCase();
    case 'surface':
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'round':
      return value.toUpperCase();
    case 'subtab':
      return value.toLowerCase();
    default:
      return value;
  }
}

function buildFilterPathSegments(filters: RecordFilters): string {
  const parts: string[] = [];

  if (filters.level?.length) {
    const values = Array.from(new Set(filters.level.map(v => normalizeFilterValue('level', v)))).sort();
    values.forEach(value => parts.push(`level/${value}`));
  }

  if (filters.surface?.length) {
    const values = Array.from(new Set(filters.surface.map(v => normalizeFilterValue('surface', v)))).sort();
    values.forEach(value => parts.push(`surface/${value}`));
  }

  if (filters.round) {
    parts.push(`round/${normalizeFilterValue('round', filters.round)}`);
  }

  if (filters.bestOf != null) {
    parts.push(`bestOf/${filters.bestOf}`);
  }

  if (filters.subtab) {
    parts.push(`subtab/${normalizeFilterValue('subtab', filters.subtab)}`);
  }

  return parts.join('/');
}

function titleToCanonicalPath(title: string): string {
  const trimmed = title.split('–')[0].trim();
  const normalized = trimmed
    .replace(/\bmatch\s+wins\b/gi, 'wins')
    .replace(/\bmatch\s+win\b/gi, 'win');

  const slug = normalized
    .toLowerCase()
    .replace(/–/g, '-')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `/records/${slug}`;
}

function buildWhitelistCanonicalPath(entry: WhitelistEntry): string {
  if (entry.canonicalPath) return entry.canonicalPath;
  if (entry.title) return titleToCanonicalPath(entry.title);
  const qs = buildCanonicalQueryString(entry.filters);
  const path = `/records/${entry.slug.map(encodeURIComponent).join('/')}`;
  return qs ? `${path}?${qs}` : path;
}

const ALLOWED_RECORDS_CANONICAL_PATHS = new Set<string>([
'/records/most-career-wins',
'/records/most-wins-on-hard-court',
'/records/most-wins-on-clay-court',
'/records/most-wins-on-grass-court',
'/records/most-wins-on-carpet-court',
'/records/most-wins-in-atp-finals',
'/records/most-grand-slam-wins',
'/records/most-masters-1000-wins',
'/records/most-atp-250-wins',
'/records/most-atp-500-wins',
'/records/most-davis-cup-wins',
'/records/most-wins-best-of-3',
'/records/most-wins-best-of-5',
'/records/most-matches-played',
'/records/most-matches-played-on-hard-court',
'/records/most-matches-played-on-clay-court',
'/records/most-matches-played-on-grass-court',
'/records/most-matches-played-on-carpet-court',
'/records/most-grand-slam-matches-played',
'/records/most-matches-played-at-masters-1000',
'/records/most-atp-250-matches-played',
'/records/most-atp-500-matches-played',
'/records/most-davis-cup-matches-played',
'/records/most-matches-played-best-of-3',
'/records/most-matches-played-best-of-5',
'/records/most-finals-reached',
'/records/most-semifinals-reached',
'/records/most-quarterfinals-reached',
'/records/most-grand-slam-finals-reached',
'/records/most-grand-slam-semifinals-reached',
'/records/most-grand-slam-quarterfinals-reached',
'/records/most-masters-1000-finals-reached',
'/records/most-masters-1000-semifinals-reached',
'/records/most-masters-1000-quarterfinals-reached',
'/records/most-hard-court-finals-reached',
'/records/most-clay-court-finals-reached',
'/records/most-grass-court-finals-reached',
'/records/most-carpet-court-finals-reached',
'/records/most-atp-titles',
'/records/most-titles-won-on-hard-court',
'/records/most-titles-won-on-clay',
'/records/most-titles-won-on-grass',
'/records/most-titles-won-on-carpet',
'/records/most-grand-slam-titles',
'/records/most-masters-1000-titles',
'/records/most-appearances',
'/records/most-appearances-on-hard-court',
'/records/most-appearances-on-clay-court',
'/records/most-appearances-on-grass-court',
'/records/most-appearances-on-carpet-court',
'/records/most-grand-slam-appearances',
'/records/most-masters-1000-appearances',
'/records/oldest-players-in-main-draw',
'/records/oldest-players-in-main-draw-on-hard-court',
'/records/oldest-players-in-main-draw-on-clay-court',
'/records/oldest-players-in-main-draw-on-grass-court',
'/records/oldest-players-in-main-draw-on-carpet-court',
'/records/oldest-players-in-main-draw-at-grand-slam',
'/records/oldest-players-in-main-draw-at-masters-1000',
'/records/oldest-grand-slam-finalists',
'/records/oldest-grand-slam-semifinalists',
'/records/oldest-grand-slam-quarterfinalists',
'/records/oldest-masters-1000-finalists',
'/records/oldest-masters-1000-semifinalists',
'/records/oldest-masters-1000-quarterfinalists',
'/records/youngest-players-in-main-draw-at-grand-slam',
'/records/youngest-players-in-main-draw-at-masters-1000',
'/records/youngest-grand-slam-finalists',
'/records/youngest-grand-slam-semifinalists',
'/records/youngest-grand-slam-quarterfinalists',
'/records/youngest-masters-1000-finalists',
'/records/youngest-masters-1000-semifinalists',
'/records/youngest-masters-1000-quarterfinalists',
'/records/oldest-title-winners',
'/records/oldest-hard-court-title-winners',
'/records/oldest-clay-court-title-winners',
'/records/oldest-grass-court-title-winners',
'/records/oldest-carpet-court-title-winners',
'/records/oldest-grand-slam-title-winners',
'/records/oldest-masters-1000-title-winners',
'/records/youngest-title-winners',
'/records/youngest-hard-court-title-winners',
'/records/youngest-clay-court-title-winners',
'/records/youngest-grass-court-title-winners',
'/records/youngest-carpet-court-title-winners',
'/records/youngest-grand-slam-title-winners',
'/records/youngest-masters-1000-title-winners',
'/records/longest-appearance-timespan',
'/records/longest-appearance-timespan-at-grand-slams',
'/records/longest-appearance-timespan-at-masters-1000',
'/records/longest-appearance-timespan-at-atp-finals',
'/records/longest-appearance-timespan-at-atp-250',
'/records/longest-appearance-timespan-at-atp-500',
'/records/longest-hard-court-appearance-timespan',
'/records/longest-clay-court-appearance-timespan',
'/records/longest-grass-court-appearance-timespan',
'/records/longest-carpet-court-appearance-timespan',
'/records/longest-timespan-between-two-atp-finals-titles',
'/records/longest-timespan-between-two-atp-250-titles',
'/records/longest-timespan-between-two-atp-500-titles',
'/records/longest-timespan-between-two-hard-court-titles',
'/records/longest-timespan-between-two-clay-court-titles',
'/records/longest-timespan-between-two-grass-court-titles',
'/records/longest-timespan-between-two-carpet-court-titles',
'/records/longest-timespan-between-2-atp-titles',
'/records/longest-timespan-between-two-grand-slam-titles',
'/records/longest-timespan-between-two-masters-1000-titles',
'/records/best-winning-percentage',
'/records/best-win-percentage-on-hard-court',
'/records/best-win-percentage-on-clay-court',
'/records/best-win-percentage-on-grass-court',
'/records/best-win-percentage-on-carpet-court',
'/records/best-win-percentage-at-grand-slams',
'/records/best-win-percentage-at-masters-1000',
'/records/most-titles-per-appearance',
'/records/most-grand-slam-titles-per-appearance',
'/records/most-masters-1000-titles-per-appearance',
'/records/most-wins-at-single-tournament',
'/records/most-wins-at-single-grand-slam-tournament',
'/records/most-wins-at-single-masters-1000-tournament',
'/records/most-matches-played-at-single-tournament',
'/records/most-matches-played-at-single-grand-slam-tournament',
'/records/most-matches-played-at-single-masters-1000-tournament',
'/records/most-appearances-at-single-tournament',
'/records/most-appearances-at-single-grand-slam-tournament',
'/records/most-appearances-at-single-masters-1000-tournament',
'/records/most-titles-at-single-tournament',
'/records/most-titles-at-single-grand-slam-tournament',
'/records/most-titles-at-single-masters-1000-tournament',
'/records/most-finals-at-single-tournament',
'/records/most-semifinals-at-single-tournament',
'/records/most-quarterfinals-at-single-tournament',
'/records/most-tournament-appearances-in-single-season',
'/records/most-wins-in-single-season',
'/records/most-hard-court-wins-in-a-single-season',
'/records/most-clay-court-wins-in-a-single-season',
'/records/most-grass-court-wins-in-a-single-season',
'/records/most-carpet-court-wins-in-a-single-season',
'/records/most-grand-slam-wins-in-a-single-season',
'/records/most-masters-1000-wins-in-a-single-season',
'/records/most-matches-played-in-single-season',
'/records/most-hard-court-matches-played-in-a-single-season',
'/records/most-clay-court-matches-played-in-a-single-season',
'/records/most-grass-court-matches-played-in-a-single-season',
'/records/most-carpet-court-matches-played-in-a-single-season',
'/records/most-grand-slam-matches-played-in-a-single-season',
'/records/most-masters-1000-matches-played-in-a-single-season',
'/records/most-titles-in-single-season',
'/records/most-hard-court-titles-in-a-single-season',
'/records/most-clay-court-titles-in-a-single-season',
'/records/most-grass-court-titles-in-a-single-season',
'/records/most-carpet-court-titles-in-a-single-season',
'/records/most-grand-slam-titles-in-a-single-season',
'/records/most-masters-1000-titles-in-a-single-season',
'/records/most-finals-in-a-single-season',
'/records/best-win-percentage-in-single-season',
'/records/most-played-h2h',
'/records/longest-win-streak',
'/records/longest-winning-streak',
'/records/longest-winning-streak-on-hard-court',
'/records/longest-winning-streak-on-clay',
'/records/longest-winning-streak-on-grass',
'/records/longest-winning-streak-on-carpet',
'/records/longest-winning-streak-at-grand-slams',
'/records/longest-winning-streak-at-masters-1000',
'/records/longest-streak-of-consecutive-finals',
'/records/longest-streak-of-consecutive-semifinals',
'/records/longest-streak-of-consecutive-quarterfinals',
'/records/longest-streak-of-consecutive-grand-slam-finals',
'/records/longest-streak-of-consecutive-grand-slam-semifinals',
'/records/longest-streak-of-consecutive-grand-slam-quarterfinals',
'/records/longest-streak-of-consecutive-masters-1000-finals',
]);

const WHITELIST_CANONICAL_PATH_MAP = new Map<string, WhitelistEntry>();

const WHITELIST_RAW: WhitelistEntry[] = [
  // --- wins (base) -----------------------------------------------------------
  { slug: ['wins'], filters: {}, title: 'Most Career Wins' },

  // --- wins (level) ----------------------------------------------------------
  { slug: ['wins'], filters: { level: ['G'] }, title: 'Most Grand Slam Match Wins' },
  { slug: ['wins'], filters: { level: ['M'] }, title: 'Most Masters 1000 Match Wins' },
  { slug: ['wins'], filters: { level: ['F'] }, title: 'Most Wins in ATP Finals', canonicalPath: '/records/most-wins-in-atp-finals' },
  { slug: ['wins'], filters: { level: ['250'] }, title: 'Most ATP 250 Match Wins' },
  { slug: ['wins'], filters: { level: ['500'] }, title: 'Most ATP 500 Match Wins' },
  { slug: ['wins'], filters: { level: ['D'] }, title: 'Most Davis Cup Match Wins' },

  // --- wins (surface) --------------------------------------------------------
  { slug: ['wins'], filters: { surface: ['Hard'] }, title: 'Most Wins on Hard Court' },
  { slug: ['wins'], filters: { surface: ['Clay'] }, title: 'Most Wins on Clay', canonicalPath: '/records/most-wins-on-clay-court' },
  { slug: ['wins'], filters: { surface: ['Grass'] }, title: 'Most Wins on Grass', canonicalPath: '/records/most-wins-on-grass-court' },
  { slug: ['wins'], filters: { surface: ['Carpet'] }, title: 'Most Wins on Carpet', canonicalPath: '/records/most-wins-on-carpet-court' },

  // --- wins (round) ----------------------------------------------------------
  { slug: ['wins'], filters: { round: 'QF' }, title: 'Most Wins in Quarter Finals' },
  { slug: ['wins'], filters: { round: 'SF' }, title: 'Most Wins in Semi Finals' },
  { slug: ['wins'], filters: { round: 'F' }, title: 'Most Wins in Finals' },
  { slug: ['wins'], filters: { bestOf: 3 }, title: 'Most Wins Best of 3' },
  { slug: ['wins'], filters: { bestOf: 5 }, title: 'Most Wins Best of 5' },

  // --- wins (2-filter: level+round) -----------------------------------------
  { slug: ['wins'], filters: { level: ['G'], round: 'F' }, title: 'Most Wins in Grand Slam Finals' },
  { slug: ['wins'], filters: { level: ['G'], round: 'SF' }, title: 'Most Wins in Grand Slam Semifinals' },
  { slug: ['wins'], filters: { level: ['G'], round: 'QF' }, title: 'Most Wins in Grand Slam Quarterfinals' },
  { slug: ['wins'], filters: { level: ['M'], round: 'QF' }, title: 'Most Wins in Masters 1000 Quarterfinals' },
  { slug: ['wins'], filters: { level: ['M'], round: 'SF' }, title: 'Most Wins in Masters 1000 Semifinals' },
  { slug: ['wins'], filters: { level: ['M'], round: 'F' }, title: 'Most Wins in Masters 1000 Finals' },

  // --- wins (2-filter: level+surface) ---------------------------------------
  { slug: ['wins'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Match Wins at Roland Garros' },
  { slug: ['wins'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Match Wins at Wimbledon' },
  { slug: ['wins'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Match Wins at Hard Court Grand Slams', canonicalPath: '/records/most-wins-grand-slams-on-hard' },
  { slug: ['wins'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Masters 1000 Match Wins on Hard Court', canonicalPath: '/records/most-wins-masters-1000-on-hard' },
  { slug: ['wins'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Match Wins on Clay Court', canonicalPath: '/records/most-wins-masters-1000-on-clay' },
  { slug: ['wins'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Match Wins on Carpet Court', canonicalPath: '/records/most-wins-masters-1000-on-carpet' },

  // --- wins (3-filter: bestOf+level+surface) --------------------------------
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Clay Court Wins Best of 3' },
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Hard'] }, title: 'Most Masters 1000 Hard Court Wins Best of 3' },
  { slug: ['wins'], filters: { bestOf: 3, level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Carpet Court Wins Best of 3' },

  // --- played (base) ---------------------------------------------------------
  { slug: ['played'], filters: {}, title: 'Most Matches Played', canonicalPath: '/records/most-matches-played' },

  // --- played (level) --------------------------------------------------------
  { slug: ['played'], filters: { level: ['G'] }, title: 'Most Matches Played at Grand Slams', canonicalPath: '/records/most-grand-slam-matches-played' },
  { slug: ['played'], filters: { level: ['M'] }, title: 'Most Matches Played at Masters 1000' },
  { slug: ['played'], filters: { level: ['F'] }, title: 'Most Matches Played at ATP Finals' },
  { slug: ['played'], filters: { level: ['250'] }, title: 'Most ATP 250 Matches Played' },
  { slug: ['played'], filters: { level: ['500'] }, title: 'Most ATP 500 Matches Played' },
  { slug: ['played'], filters: { level: ['D'] }, title: 'Most Davis Cup Matches Played' },

  // --- played (surface) ------------------------------------------------------
  { slug: ['played'], filters: { surface: ['Hard'] }, title: 'Most Matches Played on Hard Court', canonicalPath: '/records/most-matches-played-on-hard-court' },
  { slug: ['played'], filters: { surface: ['Clay'] }, title: 'Most Matches Played on Clay Court', canonicalPath: '/records/most-matches-played-on-clay-court' },
  { slug: ['played'], filters: { surface: ['Grass'] }, title: 'Most Matches Played on Grass Court', canonicalPath: '/records/most-matches-played-on-grass-court' },
  { slug: ['played'], filters: { surface: ['Carpet'] }, title: 'Most Matches Played on Carpet Court', canonicalPath: '/records/most-matches-played-on-carpet-court' },

  // --- played (round) --------------------------------------------------------
  { slug: ['played'], filters: { round: 'QF' }, title: 'Most Quarterfinals Played', canonicalPath: '/records/most-quarterfinals-played' },
  { slug: ['played'], filters: { round: 'SF' }, title: 'Most Semifinals Played', canonicalPath: '/records/most-semifinals-played' },
  { slug: ['played'], filters: { round: 'F' }, title: 'Most Finals Played – ATP All-Time Records' },

  // --- played (bestOf) -------------------------------------------------------
  { slug: ['played'], filters: { bestOf: 3 }, title: 'Most Matches Played Best of 3', canonicalPath: '/records/most-matches-played-best-of-3' },
  { slug: ['played'], filters: { bestOf: 5 }, title: 'Most Matches Played Best of 5', canonicalPath: '/records/most-matches-played-best-of-5' },

  // --- played (2-filter: level+surface) -------------------------------------
  { slug: ['played'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Hard Court Grand Slam Matches Played' },
  { slug: ['played'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Clay Court Grand Slam Matches Played' },
  { slug: ['played'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Grass Court Grand Slam Matches Played' },
  { slug: ['played'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Masters 1000 Hard Court Matches Played' },
  { slug: ['played'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Clay Court Matches Played' },
  { slug: ['played'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Carpet Court Matches Played' },

  // --- played (3-filter: bestOf+level+surface) ------------------------------
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Clay Court Matches Played Best of 3' },
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Hard'] }, title: 'Most Masters 1000 Hard Court Matches Played Best of 3' },
  { slug: ['played'], filters: { bestOf: 3, level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Carpet Court Matches Played Best of 3' },

  // --- count (base) ----------------------------------------------------------
  { slug: ['count'], filters: {}, canonicalPath: '/records/rounds', title: 'Rounds' },

  // --- count (round) ---------------------------------------------------------
  { slug: ['count'], filters: { round: 'QF' }, title: 'Most Quarterfinals Reached', canonicalPath: '/records/most-quarterfinals-reached' },
  { slug: ['count'], filters: { round: 'SF' }, title: 'Most Semifinals Reached', canonicalPath: '/records/most-semifinals-reached' },
  { slug: ['count'], filters: { round: 'F' }, canonicalPath: '/records/most-finals-reached', title: 'Most finals reached' },

  // --- count (2-filter: level+round) ----------------------------------------
  { slug: ['count'], filters: { level: ['G'], round: 'QF' }, title: 'Most Grand Slam Quarterfinals Reached' },
  { slug: ['count'], filters: { level: ['G'], round: 'SF' }, title: 'Most Grand Slam Semifinals Reached', canonicalPath: '/records/most-grand-slam-semifinals-reached' },
  { slug: ['count'], filters: { level: ['G'], round: 'F' }, title: 'Most Grand Slam Finals Reached', canonicalPath: '/records/most-grand-slam-finals-reached' },
  { slug: ['count'], filters: { level: ['M'], round: 'QF' }, title: 'Most Masters 1000 Quarterfinals Reached', canonicalPath: '/records/most-masters-1000-quarterfinals-reached' },
  { slug: ['count'], filters: { level: ['M'], round: 'SF' }, title: 'Most Masters 1000 Semifinals Reached', canonicalPath: '/records/most-masters-1000-semifinals-reached' },
  { slug: ['count'], filters: { level: ['M'], round: 'F' }, title: 'Most Masters 1000 Finals Reached', canonicalPath: '/records/most-masters-1000-finals-reached' },
  { slug: ['count'], filters: { level: ['250'], round: 'QF' }, title: 'Most ATP 250 Quarterfinals Reached', canonicalPath: '/records/most-atp-250-quarterfinals-reached' },
  { slug: ['count'], filters: { level: ['250'], round: 'SF' }, title: 'Most ATP 250 Semifinals Reached', canonicalPath: '/records/most-atp-250-semifinals-reached' },
  { slug: ['count'], filters: { level: ['250'], round: 'F' }, title: 'Most ATP 250 Finals Reached', canonicalPath: '/records/most-atp-250-finals-reached' },
  { slug: ['count'], filters: { level: ['500'], round: 'QF' }, title: 'Most ATP 500 Quarterfinals Reached', canonicalPath: '/records/most-atp-500-quarterfinals-reached' },
  { slug: ['count'], filters: { level: ['500'], round: 'SF' }, title: 'Most ATP 500 Semifinals Reached', canonicalPath: '/records/most-atp-500-semifinals-reached' },
  { slug: ['count'], filters: { level: ['500'], round: 'F' }, title: 'Most ATP 500 Finals Reached', canonicalPath: '/records/most-atp-500-finals-reached' },

  // --- count (2-filter: surface+round) --------------------------------------
  { slug: ['count'], filters: { surface: ['Hard'], round: 'QF' }, title: 'Most Hard Court Quarterfinals Reached', canonicalPath: '/records/most-hard-court-quarterfinals-reached' },
  { slug: ['count'], filters: { surface: ['Hard'], round: 'SF' }, title: 'Most Hard Court Semifinals Reached', canonicalPath: '/records/most-hard-court-semifinals-reached' },
  { slug: ['count'], filters: { surface: ['Hard'], round: 'F' }, title: 'Most Hard Court Finals Reached', canonicalPath: '/records/most-hard-court-finals-reached' },
  { slug: ['count'], filters: { surface: ['Clay'], round: 'QF' }, title: 'Most Clay Court Quarterfinals Reached', canonicalPath: '/records/most-clay-court-quarterfinals-reached' },
  { slug: ['count'], filters: { surface: ['Clay'], round: 'SF' }, title: 'Most Clay Court Semifinals Reached', canonicalPath: '/records/most-clay-court-semifinals-reached' },
  { slug: ['count'], filters: { surface: ['Clay'], round: 'F' }, title: 'Most Clay Court Finals Reached', canonicalPath: '/records/most-clay-court-finals-reached' },
  { slug: ['count'], filters: { surface: ['Grass'], round: 'QF' }, title: 'Most Grass Court Quarterfinals Reached', canonicalPath: '/records/most-grass-court-quarterfinals-reached' },
  { slug: ['count'], filters: { surface: ['Grass'], round: 'SF' }, title: 'Most Grass Court Semifinals Reached', canonicalPath: '/records/most-grass-court-semifinals-reached' },
  { slug: ['count'], filters: { surface: ['Grass'], round: 'F' }, title: 'Most Grass Court Finals Reached', canonicalPath: '/records/most-grass-court-finals-reached' },
  { slug: ['count'], filters: { surface: ['Carpet'], round: 'QF' }, title: 'Most Carpet Court Quarterfinals Reached', canonicalPath: '/records/most-carpet-court-quarterfinals-reached' },
  { slug: ['count'], filters: { surface: ['Carpet'], round: 'SF' }, title: 'Most Carpet Court Semifinals Reached', canonicalPath: '/records/most-carpet-court-semifinals-reached' },
  { slug: ['count'], filters: { surface: ['Carpet'], round: 'F' }, title: 'Most Carpet Court Finals Reached', canonicalPath: '/records/most-carpet-court-finals-reached' },

  // --- titles (base) ---------------------------------------------------------
  { slug: ['titles'], filters: {}, title: 'Most ATP Titles', canonicalPath: '/records/most-atp-titles' },

  // --- titles (level) --------------------------------------------------------
  { slug: ['titles'], filters: { level: ['G'] }, title: 'Most Grand Slam Titles' },
  { slug: ['titles'], filters: { level: ['M'] }, title: 'Most Masters 1000 Titles' },
  { slug: ['titles'], filters: { level: ['F'] }, title: 'Most ATP Finals Titles' },
  { slug: ['titles'], filters: { level: ['250'] }, title: 'Most ATP 250 Titles', canonicalPath: '/records/most-atp-250-titles' },
  { slug: ['titles'], filters: { level: ['500'] }, title: 'Most ATP 500 Titles', canonicalPath: '/records/most-atp-500-titles' },
  { slug: ['titles'], filters: { level: ['D'] }, title: 'Most Davis Cup Titles' },

  // --- titles (surface) ------------------------------------------------------
  { slug: ['titles'], filters: { surface: ['Hard'] }, title: 'Most Titles Won on Hard Court' },
  { slug: ['titles'], filters: { surface: ['Clay'] }, title: 'Most Titles Won on Clay' },
  { slug: ['titles'], filters: { surface: ['Grass'] }, title: 'Most Titles Won on Grass' },
  { slug: ['titles'], filters: { surface: ['Carpet'] }, title: 'Most Titles Won on Carpet' },

  // --- titles (level + surface: Grand Slam) ----------------------------------
  { slug: ['titles'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Clay Court Grand Slam Titles' },
  { slug: ['titles'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Grass Court Grand Slam Titles' },
  { slug: ['titles'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Hard Court Grand Slam Titles' },
  { slug: ['titles'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Most Carpet Court Grand Slam Titles' },

  // --- titles (level + surface: Masters 1000) --------------------------------
  { slug: ['titles'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Masters 1000 Hard Court Titles' },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Clay Court Titles' },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Most Masters 1000 Grass Court Titles' },
  { slug: ['titles'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Carpet Court Titles' },

  // --- titles (level + surface: ATP Finals) ----------------------------------
  { slug: ['titles'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Most ATP Finals Titles on Hard Court' },
  { slug: ['titles'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Most ATP Finals Titles on Clay' },
  { slug: ['titles'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Most ATP Finals Titles on Grass' },
  { slug: ['titles'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Most ATP Finals Titles on Carpet' },

  // --- titles (level + surface: ATP 250) -------------------------------------
  { slug: ['titles'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Most ATP 250 Hard Court Titles' },
  { slug: ['titles'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Most ATP 250 Clay Court Titles' },
  { slug: ['titles'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Most ATP 250 Grass Court Titles' },
  { slug: ['titles'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Most ATP 250 Carpet Court Titles' },

  // --- titles (level + surface: ATP 500) -------------------------------------
  { slug: ['titles'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Most ATP 500 Hard Court Titles' },
  { slug: ['titles'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Most ATP 500 Clay Court Titles' },
  { slug: ['titles'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Most ATP 500 Grass Court Titles' },
  { slug: ['titles'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Most ATP 500 Carpet Court Titles' },

  // --- titles (level + surface: Davis Cup) -----------------------------------
  { slug: ['titles'], filters: { level: ['D'], surface: ['Hard'] }, title: 'Most Davis Cup Hard Court Titles' },
  { slug: ['titles'], filters: { level: ['D'], surface: ['Clay'] }, title: 'Most Davis Cup Clay Court Titles' },
  { slug: ['titles'], filters: { level: ['D'], surface: ['Grass'] }, title: 'Most Davis Cup Grass Court Titles' },
  { slug: ['titles'], filters: { level: ['D'], surface: ['Carpet'] }, title: 'Most Davis Cup Carpet Court Titles' },

  // --- entries (base) --------------------------------------------------------
  { slug: ['entries'], filters: {}, title: 'Most Appearances', canonicalPath: '/records/most-appearances' },

  // --- entries (level) -------------------------------------------------------
  { slug: ['entries'], filters: { level: ['G'] }, title: 'Most Grand Slam Appearances' },
  { slug: ['entries'], filters: { level: ['M'] }, title: 'Most Masters 1000 Appearances' },
  { slug: ['entries'], filters: { level: ['F'] }, title: 'Most ATP Finals Appearances', canonicalPath: '/records/most-atp-finals-appearances' },
  { slug: ['entries'], filters: { level: ['250'] }, title: 'Most ATP 250 Appearances', canonicalPath: '/records/most-atp-250-appearances' },
  { slug: ['entries'], filters: { level: ['500'] }, title: 'Most ATP 500 Appearances', canonicalPath: '/records/most-atp-500-appearances' },
  { slug: ['entries'], filters: { level: ['D'] }, title: 'Most Davis Cup Appearances' },

  // --- entries (surface) -----------------------------------------------------
  { slug: ['entries'], filters: { surface: ['Hard'] }, title: 'Most Appearances on Hard Court', canonicalPath: '/records/most-appearances-on-hard-court' },
  { slug: ['entries'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Appearances', canonicalPath: '/records/most-appearances-on-clay-court' },
  { slug: ['entries'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Appearances', canonicalPath: '/records/most-appearances-on-grass-court' },
  { slug: ['entries'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Appearances', canonicalPath: '/records/most-appearances-on-carpet-court' },

  // --- entries (level + surface: Grand Slam) ---------------------------------
  { slug: ['entries'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Appearances on Hard Court Grand Slams', canonicalPath: '/records/most-appearances-on-hard-court-grand-slam' },
  { slug: ['entries'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Clay Court Grand Slam Appearances' },
  { slug: ['entries'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Grass Court Grand Slam Appearances' },
  { slug: ['entries'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Most Carpet Court Grand Slam Appearances' },

  // --- entries (level + surface: Masters 1000) -------------------------------
  { slug: ['entries'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Appearances on Hard Court Masters 1000', canonicalPath: '/records/most-appearances-on-hard-court-masters-1000' },
  { slug: ['entries'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Masters 1000 Clay Court Appearances' },
  { slug: ['entries'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Most Masters 1000 Grass Court Appearances' },
  { slug: ['entries'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Masters 1000 Carpet Court Appearances' },

  // --- entries (level + surface: ATP Finals) ---------------------------------
  { slug: ['entries'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Most ATP Finals Appearances on Hard Court', canonicalPath: '/records/most-appearances-on-hard-court-atp-finals' },
  { slug: ['entries'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Most ATP Finals Appearances on Clay' },
  { slug: ['entries'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Most ATP Finals Appearances on Grass' },
  { slug: ['entries'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Most ATP Finals Appearances on Carpet' },

  // --- entries (level + surface: ATP 250) ------------------------------------
  { slug: ['entries'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Most Appearances on Hard Court ATP 250', canonicalPath: '/records/most-appearances-on-hard-court-atp-250' },
  { slug: ['entries'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Most ATP 250 Clay Court Appearances' },
  { slug: ['entries'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Most ATP 250 Grass Court Appearances' },
  { slug: ['entries'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Most ATP 250 Carpet Court Appearances' },

  // --- entries (level + surface: ATP 500) ------------------------------------
  { slug: ['entries'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Most Appearances on Hard Court ATP 500', canonicalPath: '/records/most-appearances-on-hard-court-atp-500' },
  { slug: ['entries'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Most ATP 500 Clay Court Appearances' },
  { slug: ['entries'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Most ATP 500 Grass Court Appearances' },
  { slug: ['entries'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Most ATP 500 Carpet Court Appearances' },

  // --- entries (level + surface: Davis Cup) ----------------------------------
  { slug: ['entries'], filters: { level: ['D'], surface: ['Hard'] }, title: 'Most Appearances on Hard Court Davis Cup', canonicalPath: '/records/most-appearances-on-hard-court-davis-cup' },
  { slug: ['entries'], filters: { level: ['D'], surface: ['Clay'] }, title: 'Most Davis Cup Clay Court Appearances' },
  { slug: ['entries'], filters: { level: ['D'], surface: ['Grass'] }, title: 'Most Davis Cup Grass Court Appearances' },
  { slug: ['entries'], filters: { level: ['D'], surface: ['Carpet'] }, title: 'Most Davis Cup Carpet Court Appearances' },

  // --- percentage (base) ----------------------------------------------------
  { slug: ['percentage'], filters: {}, title: 'Best Winning Percentage', canonicalPath: '/records/best-winning-percentage' },

  // --- percentage (level) ----------------------------------------------------
  { slug: ['percentage'], filters: { level: ['G'] }, title: 'Best Win Percentage at Grand Slams' },
  { slug: ['percentage'], filters: { level: ['M'] }, title: 'Best Win Percentage at Masters 1000' },
  { slug: ['percentage'], filters: { level: ['F'] }, title: 'Best Win Percentage at ATP Finals' },
  { slug: ['percentage'], filters: { level: ['250'] }, title: 'Best Win Percentage at ATP 250' },
  { slug: ['percentage'], filters: { level: ['500'] }, title: 'Best Win Percentage at ATP 500' },

  // --- percentage (surface) --------------------------------------------------
  { slug: ['percentage'], filters: { surface: ['Hard'] }, title: 'Best Win Percentage on Hard Court' },
  { slug: ['percentage'], filters: { surface: ['Clay'] }, title: 'Best Win Percentage on Clay Court' },
  { slug: ['percentage'], filters: { surface: ['Grass'] }, title: 'Best Win Percentage on Grass Court' },
  { slug: ['percentage'], filters: { surface: ['Carpet'] }, title: 'Best Win Percentage on Carpet Court' },

  // --- percentage (round) ----------------------------------------------------
  { slug: ['percentage'], filters: { round: 'QF' }, title: 'Best Win Percentage in Quarterfinals' },
  { slug: ['percentage'], filters: { round: 'SF' }, title: 'Best Win Percentage in Semifinals' },
  { slug: ['percentage'], filters: { round: 'F' }, title: 'Best Win Percentage in Finals' },

  // --- percentage (2-filter: level+surface) ---------------------------------
  { slug: ['percentage'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Best Winning Percentage in Grand Slams on Hard Court' },
  { slug: ['percentage'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Best Win Percentage at Roland Garros' },
  { slug: ['percentage'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Best Win Percentage at Wimbledon' },

  // --- ages/oldest (base) ----------------------------------------------------
  { slug: ['ages', 'oldest'], filters: {}, title: 'Oldest Players in Main Draw', canonicalPath: '/records/oldest-players-in-main-draw' },

  // --- ages/oldest (level) ---------------------------------------------------
  { slug: ['ages', 'oldest'], filters: { level: ['G'] }, title: 'Oldest Players in Main Draw at Grand Slams', canonicalPath: '/records/oldest-players-in-main-draw-at-grand-slam' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'] }, title: 'Oldest Players in Main Draw at Masters 1000', canonicalPath: '/records/oldest-players-in-main-draw-at-masters-1000' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'] }, title: 'Oldest Players in Main Draw at ATP Finals', canonicalPath: '/records/oldest-players-in-main-draw-at-atp-finals' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'] }, title: 'Oldest Players in Main Draw at ATP 250', canonicalPath: '/records/oldest-players-in-main-draw-at-atp-250' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'] }, title: 'Oldest Players in Main Draw at ATP 500', canonicalPath: '/records/oldest-players-in-main-draw-at-atp-500' },
  { slug: ['ages', 'oldest'], filters: { level: ['D'] }, title: 'Oldest Players in Main Draw at Davis Cup', canonicalPath: '/records/oldest-players-in-main-draw-davis-cup' },

  // --- ages/oldest (surface) -------------------------------------------------
  { slug: ['ages', 'oldest'], filters: { surface: ['Hard'] }, title: 'Oldest Players in Main Draw on Hard Court', canonicalPath: '/records/oldest-players-in-main-draw-on-hard-court' },
  { slug: ['ages', 'oldest'], filters: { surface: ['Clay'] }, title: 'Oldest Players in Main Draw on Clay Court', canonicalPath: '/records/oldest-players-in-main-draw-on-clay-court' },
  { slug: ['ages', 'oldest'], filters: { surface: ['Grass'] }, title: 'Oldest Players in Main Draw on Grass Court', canonicalPath: '/records/oldest-players-in-main-draw-on-grass-court' },
  { slug: ['ages', 'oldest'], filters: { surface: ['Carpet'] }, title: 'Oldest Players in Main Draw on Carpet Court', canonicalPath: '/records/oldest-players-in-main-draw-on-carpet-court' },

  // --- ages/oldest (round) ---------------------------------------------------
  { slug: ['ages', 'oldest'], filters: { round: 'R128' }, title: 'Oldest R128 Players' },
  { slug: ['ages', 'oldest'], filters: { round: 'R64' }, title: 'Oldest R64 Players' },
  { slug: ['ages', 'oldest'], filters: { round: 'R32' }, title: 'Oldest R32 Players' },
  { slug: ['ages', 'oldest'], filters: { round: 'R16' }, title: 'Oldest R16 Players' },
  { slug: ['ages', 'oldest'], filters: { round: 'QF' }, title: 'Oldest Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { round: 'SF' }, title: 'Oldest Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { round: 'F' }, title: 'Oldest Finalists' },

  // --- ages/oldest (level + round) -------------------------------------------
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'R128' }, title: 'Oldest Grand Slam R128 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'R64' }, title: 'Oldest Grand Slam R64 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'R32' }, title: 'Oldest Grand Slam R32 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'R16' }, title: 'Oldest Grand Slam R16 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'QF' }, title: 'Oldest Grand Slam Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'SF' }, title: 'Oldest Grand Slam Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['G'], round: 'F' }, title: 'Oldest Grand Slam Finalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'R128' }, title: 'Oldest Masters 1000 R128 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'R64' }, title: 'Oldest Masters 1000 R64 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'R32' }, title: 'Oldest Masters 1000 R32 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'R16' }, title: 'Oldest Masters 1000 R16 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'QF' }, title: 'Oldest Masters 1000 Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'SF' }, title: 'Oldest Masters 1000 Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['M'], round: 'F' }, title: 'Oldest Masters 1000 Finalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'R128' }, title: 'Oldest ATP Finals R128 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'R64' }, title: 'Oldest ATP Finals R64 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'R32' }, title: 'Oldest ATP Finals R32 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'R16' }, title: 'Oldest ATP Finals R16 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'QF' }, title: 'Oldest ATP Finals Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'SF' }, title: 'Oldest ATP Finals Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['F'], round: 'F' }, title: 'Oldest ATP Finals Finalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'R128' }, title: 'Oldest ATP 250 R128 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'R64' }, title: 'Oldest ATP 250 R64 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'R32' }, title: 'Oldest ATP 250 R32 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'R16' }, title: 'Oldest ATP 250 R16 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'QF' }, title: 'Oldest ATP 250 Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'SF' }, title: 'Oldest ATP 250 Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['250'], round: 'F' }, title: 'Oldest ATP 250 Finalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'R128' }, title: 'Oldest ATP 500 R128 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'R64' }, title: 'Oldest ATP 500 R64 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'R32' }, title: 'Oldest ATP 500 R32 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'R16' }, title: 'Oldest ATP 500 R16 Players' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'QF' }, title: 'Oldest ATP 500 Quarterfinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'SF' }, title: 'Oldest ATP 500 Semifinalists' },
  { slug: ['ages', 'oldest'], filters: { level: ['500'], round: 'F' }, title: 'Oldest ATP 500 Finalists' },

  // --- ages/youngest (base) --------------------------------------------------
  { slug: ['ages', 'youngest'], filters: {}, title: 'Youngest Players in Main Draw', canonicalPath: '/records/youngest-players-in-main-draw' },

  // --- ages/youngest (level) -------------------------------------------------
  { slug: ['ages', 'youngest'], filters: { level: ['G'] }, title: 'Youngest Players in Main Draw at Grand Slams', canonicalPath: '/records/youngest-players-in-main-draw-at-grand-slam' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'] }, title: 'Youngest Players in Main Draw at Masters 1000', canonicalPath: '/records/youngest-players-in-main-draw-at-masters-1000' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'] }, title: 'Youngest Players in Main Draw at ATP Finals', canonicalPath: '/records/youngest-players-in-main-draw-at-atp-finals' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'] }, title: 'Youngest Players in Main Draw at ATP 250', canonicalPath: '/records/youngest-players-in-main-draw-at-atp-250' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'] }, title: 'Youngest Players in Main Draw at ATP 500', canonicalPath: '/records/youngest-players-in-main-draw-at-atp-500' },
  { slug: ['ages', 'youngest'], filters: { level: ['D'] }, title: 'Youngest Players in Main Draw at Davis Cup', canonicalPath: '/records/youngest-players-in-main-draw-at-davis-cup' },

  // --- ages/youngest (surface) -----------------------------------------------
  { slug: ['ages', 'youngest'], filters: { surface: ['Hard'] }, title: 'Youngest Players in Main Draw on Hard Court', canonicalPath: '/records/youngest-players-in-main-draw-on-hard-court' },
  { slug: ['ages', 'youngest'], filters: { surface: ['Clay'] }, title: 'Youngest Players in Main Draw on Clay Court', canonicalPath: '/records/youngest-players-in-main-draw-on-clay-court' },
  { slug: ['ages', 'youngest'], filters: { surface: ['Grass'] }, title: 'Youngest Players in Main Draw on Grass Court', canonicalPath: '/records/youngest-players-in-main-draw-on-grass-court' },
  { slug: ['ages', 'youngest'], filters: { surface: ['Carpet'] }, title: 'Youngest Players in Main Draw on Carpet Court', canonicalPath: '/records/youngest-players-in-main-draw-on-carpet-court' },

  // --- ages/youngest (round) -------------------------------------------------
  { slug: ['ages', 'youngest'], filters: { round: 'R128' }, title: 'Youngest R128 Players' },
  { slug: ['ages', 'youngest'], filters: { round: 'R64' }, title: 'Youngest R64 Players' },
  { slug: ['ages', 'youngest'], filters: { round: 'R32' }, title: 'Youngest R32 Players' },
  { slug: ['ages', 'youngest'], filters: { round: 'R16' }, title: 'Youngest R16 Players' },
  { slug: ['ages', 'youngest'], filters: { round: 'QF' }, title: 'Youngest Quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { round: 'SF' }, title: 'Youngest Semifinalists' },
  { slug: ['ages', 'youngest'], filters: { round: 'F' }, title: 'Youngest Finalists' },

  // --- ages/youngest (level + round) -----------------------------------------
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'R128' }, title: 'Youngest Grand Slam R128 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'R64' }, title: 'Youngest Grand Slam R64 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'R32' }, title: 'Youngest Grand Slam R32 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'R16' }, title: 'Youngest Grand Slam R16 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'QF' }, title: 'Youngest Grand Slam Quarterfinalists', canonicalPath: '/records/youngest-grand-slam-quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'SF' }, title: 'Youngest Grand Slam Semifinalists', canonicalPath: '/records/youngest-grand-slam-semifinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['G'], round: 'F' }, title: 'Youngest Grand Slam Finalists', canonicalPath: '/records/youngest-grand-slam-finalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'R128' }, title: 'Youngest Masters 1000 R128 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'R64' }, title: 'Youngest Masters 1000 R64 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'R32' }, title: 'Youngest Masters 1000 R32 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'R16' }, title: 'Youngest Masters 1000 R16 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'QF' }, title: 'Youngest Masters 1000 Quarterfinalists', canonicalPath: '/records/youngest-masters-1000-quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'SF' }, title: 'Youngest Masters 1000 Semifinalists', canonicalPath: '/records/youngest-masters-1000-semifinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['M'], round: 'F' }, title: 'Youngest Masters 1000 Finalists', canonicalPath: '/records/youngest-masters-1000-finalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'R128' }, title: 'Youngest ATP Finals R128 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'R64' }, title: 'Youngest ATP Finals R64 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'R32' }, title: 'Youngest ATP Finals R32 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'R16' }, title: 'Youngest ATP Finals R16 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'QF' }, title: 'Youngest ATP Finals Quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'SF' }, title: 'Youngest ATP Finals Semifinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['F'], round: 'F' }, title: 'Youngest ATP Finals Finalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'R128' }, title: 'Youngest ATP 250 R128 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'R64' }, title: 'Youngest ATP 250 R64 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'R32' }, title: 'Youngest ATP 250 R32 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'R16' }, title: 'Youngest ATP 250 R16 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'QF' }, title: 'Youngest ATP 250 Quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'SF' }, title: 'Youngest ATP 250 Semifinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['250'], round: 'F' }, title: 'Youngest ATP 250 Finalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'R128' }, title: 'Youngest ATP 500 R128 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'R64' }, title: 'Youngest ATP 500 R64 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'R32' }, title: 'Youngest ATP 500 R32 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'R16' }, title: 'Youngest ATP 500 R16 Players' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'QF' }, title: 'Youngest ATP 500 Quarterfinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'SF' }, title: 'Youngest ATP 500 Semifinalists' },
  { slug: ['ages', 'youngest'], filters: { level: ['500'], round: 'F' }, title: 'Youngest ATP 500 Finalists' },

  // --- ages/oldest-winners (base) --------------------------------------------
  { slug: ['ages', 'oldest-winners'], filters: {}, title: 'Oldest Title Winners', canonicalPath: '/records/oldest-title-winners' },

  // --- ages/oldest-winners (level) -------------------------------------------
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'] }, title: 'Oldest Grand Slam Title Winners', canonicalPath: '/records/oldest-grand-slam-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'] }, title: 'Oldest Masters 1000 Title Winners', canonicalPath: '/records/oldest-masters-1000-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'] }, title: 'Oldest ATP Finals Title Winners', canonicalPath: '/records/oldest-atp-finals-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'] }, title: 'Oldest ATP 250 Title Winners', canonicalPath: '/records/oldest-atp-250-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'] }, title: 'Oldest ATP 500 Title Winners', canonicalPath: '/records/oldest-atp-500-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['D'] }, title: 'Oldest Davis Cup Title Winners', canonicalPath: '/records/oldest-davis-cup-title-winners' },

  // --- ages/oldest-winners (surface) ----------------------------------------
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Hard'] }, title: 'Oldest Hard Court Title Winners', canonicalPath: '/records/oldest-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Clay'] }, title: 'Oldest Clay Court Title Winners', canonicalPath: '/records/oldest-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Grass'] }, title: 'Oldest Grass Court Title Winners', canonicalPath: '/records/oldest-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { surface: ['Carpet'] }, title: 'Oldest Carpet Court Title Winners', canonicalPath: '/records/oldest-carpet-court-title-winners' },

  // --- ages/oldest-winners (level + surface) --------------------------------
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Oldest Grand Slam Hard Court Title Winners', canonicalPath: '/records/oldest-grand-slam-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Oldest Grand Slam Clay Court Title Winners', canonicalPath: '/records/oldest-grand-slam-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Oldest Grand Slam Grass Court Title Winners', canonicalPath: '/records/oldest-grand-slam-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Oldest Grand Slam Carpet Court Title Winners', canonicalPath: '/records/oldest-grand-slam-carpet-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Oldest Masters 1000 Hard Court Title Winners', canonicalPath: '/records/oldest-masters-1000-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Oldest Masters 1000 Clay Court Title Winners', canonicalPath: '/records/oldest-masters-1000-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Oldest Masters 1000 Grass Court Title Winners', canonicalPath: '/records/oldest-masters-1000-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Oldest Masters 1000 Carpet Court Title Winners', canonicalPath: '/records/oldest-masters-1000-carpet-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Oldest ATP Finals Hard Court Title Winners', canonicalPath: '/records/oldest-atp-finals-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Oldest ATP Finals Clay Court Title Winners', canonicalPath: '/records/oldest-atp-finals-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Oldest ATP Finals Grass Court Title Winners', canonicalPath: '/records/oldest-atp-finals-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Oldest ATP Finals Carpet Court Title Winners', canonicalPath: '/records/oldest-atp-finals-carpet-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Oldest ATP 250 Hard Court Title Winners', canonicalPath: '/records/oldest-atp-250-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Oldest ATP 250 Clay Court Title Winners', canonicalPath: '/records/oldest-atp-250-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Oldest ATP 250 Grass Court Title Winners', canonicalPath: '/records/oldest-atp-250-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Oldest ATP 250 Carpet Court Title Winners', canonicalPath: '/records/oldest-atp-250-carpet-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Oldest ATP 500 Hard Court Title Winners', canonicalPath: '/records/oldest-atp-500-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Oldest ATP 500 Clay Court Title Winners', canonicalPath: '/records/oldest-atp-500-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Oldest ATP 500 Grass Court Title Winners', canonicalPath: '/records/oldest-atp-500-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Oldest ATP 500 Carpet Court Title Winners', canonicalPath: '/records/oldest-atp-500-carpet-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['D'], surface: ['Hard'] }, title: 'Oldest Davis Cup Hard Court Title Winners', canonicalPath: '/records/oldest-davis-cup-hard-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['D'], surface: ['Clay'] }, title: 'Oldest Davis Cup Clay Court Title Winners', canonicalPath: '/records/oldest-davis-cup-clay-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['D'], surface: ['Grass'] }, title: 'Oldest Davis Cup Grass Court Title Winners', canonicalPath: '/records/oldest-davis-cup-grass-court-title-winners' },
  { slug: ['ages', 'oldest-winners'], filters: { level: ['D'], surface: ['Carpet'] }, title: 'Oldest Davis Cup Carpet Court Title Winners', canonicalPath: '/records/oldest-davis-cup-carpet-court-title-winners' },

  // --- ages/youngest-winners (base) -----------------------------------------
  { slug: ['ages', 'youngest-winners'], filters: {}, title: 'Youngest Title Winners', canonicalPath: '/records/youngest-title-winners' },

  // --- ages/youngest-winners (level) ----------------------------------------
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'] }, title: 'Youngest Grand Slam Title Winners', canonicalPath: '/records/youngest-grand-slam-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'] }, title: 'Youngest Masters 1000 Title Winners', canonicalPath: '/records/youngest-masters-1000-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'] }, title: 'Youngest ATP Finals Title Winners', canonicalPath: '/records/youngest-atp-finals-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'] }, title: 'Youngest ATP 250 Title Winners', canonicalPath: '/records/youngest-atp-250-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'] }, title: 'Youngest ATP 500 Title Winners', canonicalPath: '/records/youngest-atp-500-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['D'] }, title: 'Youngest Davis Cup Title Winners', canonicalPath: '/records/youngest-davis-cup-title-winners' },

  // --- ages/youngest-winners (surface) --------------------------------------
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Hard'] }, title: 'Youngest Hard Court Title Winners', canonicalPath: '/records/youngest-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Clay'] }, title: 'Youngest Clay Court Title Winners', canonicalPath: '/records/youngest-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Grass'] }, title: 'Youngest Grass Court Title Winners', canonicalPath: '/records/youngest-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { surface: ['Carpet'] }, title: 'Youngest Carpet Court Title Winners', canonicalPath: '/records/youngest-carpet-court-title-winners' },

  // --- ages/youngest-winners (level + surface) ------------------------------
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Youngest Grand Slam Hard Court Title Winners', canonicalPath: '/records/youngest-grand-slam-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Youngest Grand Slam Clay Court Title Winners', canonicalPath: '/records/youngest-grand-slam-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Youngest Grand Slam Grass Court Title Winners', canonicalPath: '/records/youngest-grand-slam-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Youngest Grand Slam Carpet Court Title Winners', canonicalPath: '/records/youngest-grand-slam-carpet-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Youngest Masters 1000 Hard Court Title Winners', canonicalPath: '/records/youngest-masters-1000-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Youngest Masters 1000 Clay Court Title Winners', canonicalPath: '/records/youngest-masters-1000-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Youngest Masters 1000 Grass Court Title Winners', canonicalPath: '/records/youngest-masters-1000-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Youngest Masters 1000 Carpet Court Title Winners', canonicalPath: '/records/youngest-masters-1000-carpet-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Youngest ATP Finals Hard Court Title Winners', canonicalPath: '/records/youngest-atp-finals-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Youngest ATP Finals Clay Court Title Winners', canonicalPath: '/records/youngest-atp-finals-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Youngest ATP Finals Grass Court Title Winners', canonicalPath: '/records/youngest-atp-finals-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Youngest ATP Finals Carpet Court Title Winners', canonicalPath: '/records/youngest-atp-finals-carpet-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Youngest ATP 250 Hard Court Title Winners', canonicalPath: '/records/youngest-atp-250-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Youngest ATP 250 Clay Court Title Winners', canonicalPath: '/records/youngest-atp-250-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Youngest ATP 250 Grass Court Title Winners', canonicalPath: '/records/youngest-atp-250-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Youngest ATP 250 Carpet Court Title Winners', canonicalPath: '/records/youngest-atp-250-carpet-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Youngest ATP 500 Hard Court Title Winners', canonicalPath: '/records/youngest-atp-500-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Youngest ATP 500 Clay Court Title Winners', canonicalPath: '/records/youngest-atp-500-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Youngest ATP 500 Grass Court Title Winners', canonicalPath: '/records/youngest-atp-500-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Youngest ATP 500 Carpet Court Title Winners', canonicalPath: '/records/youngest-atp-500-carpet-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['D'], surface: ['Hard'] }, title: 'Youngest Davis Cup Hard Court Title Winners', canonicalPath: '/records/youngest-davis-cup-hard-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['D'], surface: ['Clay'] }, title: 'Youngest Davis Cup Clay Court Title Winners', canonicalPath: '/records/youngest-davis-cup-clay-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['D'], surface: ['Grass'] }, title: 'Youngest Davis Cup Grass Court Title Winners', canonicalPath: '/records/youngest-davis-cup-grass-court-title-winners' },
  { slug: ['ages', 'youngest-winners'], filters: { level: ['D'], surface: ['Carpet'] }, title: 'Youngest Davis Cup Carpet Court Title Winners', canonicalPath: '/records/youngest-davis-cup-carpet-court-title-winners' },

  // --- timespan/entries (base) -----------------------------------------------
  { slug: ['timespan', 'entries'], filters: {}, title: 'Longest Appearance Timespan', canonicalPath: '/records/longest-appearance-timespan' },

  // --- timespan/entries (level) ----------------------------------------------
  { slug: ['timespan', 'entries'], filters: { level: ['G'] }, title: 'Longest Appearance Timespan at Grand Slams' },
  { slug: ['timespan', 'entries'], filters: { level: ['M'] }, title: 'Longest Appearance Timespan at Masters 1000' },
  { slug: ['timespan', 'entries'], filters: { level: ['F'] }, title: 'Longest Appearance Timespan at ATP Finals' },
  { slug: ['timespan', 'entries'], filters: { level: ['250'] }, title: 'Longest Appearance Timespan at ATP 250' },
  { slug: ['timespan', 'entries'], filters: { level: ['500'] }, title: 'Longest Appearance Timespan at ATP 500' },

  // --- timespan/entries (surface) --------------------------------------------
  { slug: ['timespan', 'entries'], filters: { surface: ['Hard'] }, title: 'Longest Hard Court Appearance Timespan' },
  { slug: ['timespan', 'entries'], filters: { surface: ['Clay'] }, title: 'Longest Clay Court Appearance Timespan' },
  { slug: ['timespan', 'entries'], filters: { surface: ['Grass'] }, title: 'Longest Grass Court Appearance Timespan' },
  { slug: ['timespan', 'entries'], filters: { surface: ['Carpet'] }, title: 'Longest Carpet Court Appearance Timespan' },

  // --- timespan/titles (base) ------------------------------------------------
  { slug: ['timespan', 'titles'], filters: {}, title: 'Longest Timespan Between Two ATP Titles', canonicalPath: '/records/longest-timespan-between-2-atp-titles' },

  // --- timespan/titles (level) -----------------------------------------------
  { slug: ['timespan', 'titles'], filters: { level: ['G'] }, title: 'Longest Timespan Between Two Grand Slam Titles' },
  { slug: ['timespan', 'titles'], filters: { level: ['M'] }, title: 'Longest Timespan Between Two Masters 1000 Titles' },
  { slug: ['timespan', 'titles'], filters: { level: ['F'] }, title: 'Longest Timespan Between Two ATP Finals Titles' },
  { slug: ['timespan', 'titles'], filters: { level: ['250'] }, title: 'Longest Timespan Between Two ATP 250 Titles' },
  { slug: ['timespan', 'titles'], filters: { level: ['500'] }, title: 'Longest Timespan Between Two ATP 500 Titles' },

  // --- timespan/titles (surface) ---------------------------------------------
  { slug: ['timespan', 'titles'], filters: { surface: ['Hard'] }, title: 'Longest Timespan Between Two Hard Court Titles' },
  { slug: ['timespan', 'titles'], filters: { surface: ['Clay'] }, title: 'Longest Timespan Between Two Clay Court Titles' },
  { slug: ['timespan', 'titles'], filters: { surface: ['Grass'] }, title: 'Longest Timespan Between Two Grass Court Titles' },
  { slug: ['timespan', 'titles'], filters: { surface: ['Carpet'] }, title: 'Longest Timespan Between Two Carpet Court Titles' },

  // --- timespan/rounds (round) -----------------------------------------------
  { slug: ['timespan', 'rounds'], filters: { round: 'QF' }, title: 'Longest Timespan Between Two Quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { round: 'SF' }, title: 'Longest Timespan Between Two Semifinals' },
  { slug: ['timespan', 'rounds'], filters: { round: 'F' }, title: 'Longest Timespan Between Two Finals' },

  // --- timespan/rounds (level + round) --------------------------------------
  { slug: ['timespan', 'rounds'], filters: { level: ['G'], round: 'QF' }, title: 'Longest Timespan Between Two Grand Slam Quarterfinals', canonicalPath: '/records/longest-timespan-between-two-grand-slam-quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['G'], round: 'SF' }, title: 'Longest Timespan Between Two Grand Slam Semifinals', canonicalPath: '/records/longest-timespan-between-two-grand-slam-semifinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['G'], round: 'F' }, title: 'Longest Timespan Between Two Grand Slam Finals', canonicalPath: '/records/longest-timespan-between-two-grand-slam-finals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['M'], round: 'QF' }, title: 'Longest Timespan Between Two Masters 1000 Quarterfinals', canonicalPath: '/records/longest-timespan-between-two-masters-1000-quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['M'], round: 'SF' }, title: 'Longest Timespan Between Two Masters 1000 Semifinals', canonicalPath: '/records/longest-timespan-between-two-masters-1000-semifinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['M'], round: 'F' }, title: 'Longest Timespan Between Two Masters 1000 Finals', canonicalPath: '/records/longest-timespan-between-two-masters-1000-finals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['F'], round: 'QF' }, title: 'Longest Timespan Between Two ATP Finals Quarterfinals', canonicalPath: '/records/longest-timespan-between-two-atp-finals-quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['F'], round: 'SF' }, title: 'Longest Timespan Between Two ATP Finals Semifinals', canonicalPath: '/records/longest-timespan-between-two-atp-finals-semifinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['F'], round: 'F' }, title: 'Longest Timespan Between Two ATP Finals Finals', canonicalPath: '/records/longest-timespan-between-two-atp-finals-finals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['250'], round: 'QF' }, title: 'Longest Timespan Between Two ATP 250 Quarterfinals', canonicalPath: '/records/longest-timespan-between-two-atp-250-quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['250'], round: 'SF' }, title: 'Longest Timespan Between Two ATP 250 Semifinals', canonicalPath: '/records/longest-timespan-between-two-atp-250-semifinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['250'], round: 'F' }, title: 'Longest Timespan Between Two ATP 250 Finals', canonicalPath: '/records/longest-timespan-between-two-atp-250-finals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['500'], round: 'QF' }, title: 'Longest Timespan Between Two ATP 500 Quarterfinals', canonicalPath: '/records/longest-timespan-between-two-atp-500-quarterfinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['500'], round: 'SF' }, title: 'Longest Timespan Between Two ATP 500 Semifinals', canonicalPath: '/records/longest-timespan-between-two-atp-500-semifinals' },
  { slug: ['timespan', 'rounds'], filters: { level: ['500'], round: 'F' }, title: 'Longest Timespan Between Two ATP 500 Finals', canonicalPath: '/records/longest-timespan-between-two-atp-500-finals' },

  // --- timespan (round) — base route with round filter ----------------------
  { slug: ['timespan'], filters: { round: 'QF' }, title: 'Longest Gap Between Consecutive Quarterfinals' },
  { slug: ['timespan'], filters: { round: 'SF' }, title: 'Longest Gap Between Consecutive Semifinals' },
  { slug: ['timespan'], filters: { round: 'F' }, title: 'Longest Gap Between Consecutive Finals' },

  // --- roundsonentries (level) -----------------------------------------------
  { slug: ['roundsonentries'], filters: { level: ['G'] }, title: 'Rounds Reached per Grand Slam Entry' },
  { slug: ['roundsonentries'], filters: { level: ['M'] }, title: 'Rounds Reached per Masters 1000 Entry' },
  { slug: ['roundsonentries'], filters: { level: ['F'] }, title: 'Rounds Reached per ATP Finals Entry' },
  { slug: ['roundsonentries'], filters: { level: ['250'] }, title: 'Rounds Reached per ATP 250 Entry' },
  { slug: ['roundsonentries'], filters: { level: ['500'] }, title: 'Rounds Reached per ATP 500 Entry' },

  // --- roundsonentries/titles (base) ----------------------------------------
  { slug: ['roundsonentries', 'titles'], filters: {}, title: 'Most Titles per Appearance', canonicalPath: '/records/most-titles-per-appearance' },

  // --- roundsonentries/titles (level) ----------------------------------------
  { slug: ['roundsonentries', 'titles'], filters: { level: ['G'] }, title: 'Most Grand Slam Titles per Appearance' },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['M'] }, title: 'Most Masters 1000 Titles per Appearance' },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['F'] }, title: 'Most ATP Finals Titles per Appearance' },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['250'] }, title: 'Most ATP 250 Titles per Appearance' },
  { slug: ['roundsonentries', 'titles'], filters: { level: ['500'] }, title: 'Most ATP 500 Titles per Appearance' },

  // --- roundsonentries/titles (surface) -------------------------------------
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Titles per Appearance', canonicalPath: '/records/most-appearances-at-single-hard-court-tournament' },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Titles per Appearance', canonicalPath: '/records/most-appearances-at-single-clay-court-tournament' },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Titles per Appearance', canonicalPath: '/records/most-appearances-at-single-grass-court-tournament' },
  { slug: ['roundsonentries', 'titles'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Titles per Appearance', canonicalPath: '/records/most-appearances-at-single-carpet-court-tournament' },

  // --- roundsonentries/round (round) ----------------------------------------
  { slug: ['roundsonentries', 'round'], filters: { round: 'QF' }, title: 'Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { round: 'SF' }, title: 'Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { round: 'F' }, title: 'Finals Reached per Appearance' },

  // --- roundsonentries/round (level + round) --------------------------------
  { slug: ['roundsonentries', 'round'], filters: { level: ['G'], round: 'QF' }, title: 'Grand Slam Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['G'], round: 'SF' }, title: 'Grand Slam Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['G'], round: 'F' }, title: 'Grand Slam Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['M'], round: 'QF' }, title: 'Masters 1000 Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['M'], round: 'SF' }, title: 'Masters 1000 Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['M'], round: 'F' }, title: 'Masters 1000 Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['F'], round: 'QF' }, title: 'ATP Finals Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['F'], round: 'SF' }, title: 'ATP Finals Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['F'], round: 'F' }, title: 'ATP Finals Final Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['250'], round: 'QF' }, title: 'ATP 250 Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['250'], round: 'SF' }, title: 'ATP 250 Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['250'], round: 'F' }, title: 'ATP 250 Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['500'], round: 'QF' }, title: 'ATP 500 Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['500'], round: 'SF' }, title: 'ATP 500 Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { level: ['500'], round: 'F' }, title: 'ATP 500 Finals Reached per Appearance' },

  // --- roundsonentries/round (surface + round) ------------------------------
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Hard'], round: 'QF' }, title: 'Hard Court Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Hard'], round: 'SF' }, title: 'Hard Court Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Hard'], round: 'F' }, title: 'Hard Court Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Clay'], round: 'QF' }, title: 'Clay Court Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Clay'], round: 'SF' }, title: 'Clay Court Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Clay'], round: 'F' }, title: 'Clay Court Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Grass'], round: 'QF' }, title: 'Grass Court Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Grass'], round: 'SF' }, title: 'Grass Court Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Grass'], round: 'F' }, title: 'Grass Court Finals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Carpet'], round: 'QF' }, title: 'Carpet Court Quarterfinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Carpet'], round: 'SF' }, title: 'Carpet Court Semifinals Reached per Appearance' },
  { slug: ['roundsonentries', 'round'], filters: { surface: ['Carpet'], round: 'F' }, title: 'Carpet Court Finals Reached per Appearance' },

  // --- same/wins -------------------------------------------------------------
  { slug: ['same', 'wins'], filters: {}, title: 'Most Wins at Single Tournament', canonicalPath: '/records/most-wins-at-single-tournament' },
  { slug: ['same', 'wins'], filters: { level: ['G'] }, title: 'Most Wins at Single Grand Slam Tournament' },
  { slug: ['same', 'wins'], filters: { level: ['M'] }, title: 'Most Wins at Single Masters 1000 Tournament' },
  { slug: ['same', 'wins'], filters: { level: ['F'] }, title: 'Most Wins at Single ATP Finals Tournament' },
  { slug: ['same', 'wins'], filters: { level: ['250'] }, title: 'Most Wins at Single ATP 250 Tournament' },
  { slug: ['same', 'wins'], filters: { level: ['500'] }, title: 'Most Wins at Single ATP 500 Tournament' },
  { slug: ['same', 'wins'], filters: { surface: ['Hard'] }, title: 'Most Wins at Single Hard Court Tournament' },
  { slug: ['same', 'wins'], filters: { surface: ['Clay'] }, title: 'Most Wins at Single Clay Court Tournament' },
  { slug: ['same', 'wins'], filters: { surface: ['Grass'] }, title: 'Most Wins at Single Grass Court Tournament' },
  { slug: ['same', 'wins'], filters: { surface: ['Carpet'] }, title: 'Most Wins at Single Carpet Court Tournament' },
  { slug: ['same', 'wins'], filters: { bestOf: 3 }, title: 'Most Wins at Single Tournament Best of 3' },
  { slug: ['same', 'wins'], filters: { bestOf: 5 }, title: 'Most Wins at Single Tournament Best of 5' },

  // --- same/played -----------------------------------------------------------
  { slug: ['same', 'played'], filters: {}, title: 'Most Matches Played at Single Tournament', canonicalPath: '/records/most-matches-played-at-single-tournament' },
  { slug: ['same', 'played'], filters: { level: ['G'] }, title: 'Most Matches Played at Single Grand Slam Tournament' },
  { slug: ['same', 'played'], filters: { level: ['M'] }, title: 'Most Matches Played at Single Masters 1000 Tournament' },
  { slug: ['same', 'played'], filters: { level: ['F'] }, title: 'Most Matches Played at Single ATP Finals Tournament' },
  { slug: ['same', 'played'], filters: { level: ['250'] }, title: 'Most Matches Played at Single ATP 250 Tournament' },
  { slug: ['same', 'played'], filters: { level: ['500'] }, title: 'Most Matches Played at Single ATP 500 Tournament' },
  { slug: ['same', 'played'], filters: { surface: ['Hard'] }, title: 'Most Matches Played at Single Hard Court Tournament' },
  { slug: ['same', 'played'], filters: { surface: ['Clay'] }, title: 'Most Matches Played at Single Clay Court Tournament' },
  { slug: ['same', 'played'], filters: { surface: ['Grass'] }, title: 'Most Matches Played at Single Grass Court Tournament' },
  { slug: ['same', 'played'], filters: { surface: ['Carpet'] }, title: 'Most Matches Played at Single Carpet Court Tournament' },
  { slug: ['same', 'played'], filters: { bestOf: 3 }, title: 'Most Matches Played at Single Tournament Best of 3' },
  { slug: ['same', 'played'], filters: { bestOf: 5 }, title: 'Most Matches Played at Single Tournament Best of 5' },

  // --- same/entries ----------------------------------------------------------
  { slug: ['same', 'entries'], filters: {}, title: 'Most Appearances at Single Tournament', canonicalPath: '/records/most-appearances-at-single-tournament' },
  { slug: ['same', 'entries'], filters: { level: ['G'] }, title: 'Most Appearances at Single Grand Slam Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['M'] }, title: 'Most Appearances at Single Masters 1000 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['F'] }, title: 'Most Appearances at Single ATP Finals Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['250'] }, title: 'Most Appearances at Single ATP 250 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['500'] }, title: 'Most Appearances at Single ATP 500 Tournament' },
  { slug: ['same', 'entries'], filters: { surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court Tournament' },
  { slug: ['same', 'entries'], filters: { surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court Tournament' },
  { slug: ['same', 'entries'], filters: { surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court Tournament' },
  { slug: ['same', 'entries'], filters: { surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court Tournament' },
  // level + surface combinations
  { slug: ['same', 'entries'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court Grand Slam Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court Grand Slam Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court Grand Slam Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court Grand Slam Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court Masters 1000 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court Masters 1000 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court Masters 1000 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court Masters 1000 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court ATP Finals Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court ATP Finals Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court ATP Finals Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court ATP Finals Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court ATP 250 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court ATP 250 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court ATP 250 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court ATP 250 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Most Appearances at Single Hard Court ATP 500 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Most Appearances at Single Clay Court ATP 500 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Most Appearances at Single Grass Court ATP 500 Tournament' },
  { slug: ['same', 'entries'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Most Appearances at Single Carpet Court ATP 500 Tournament' },

  // --- same/titles -----------------------------------------------------------
  { slug: ['same', 'titles'], filters: {}, title: 'Most Titles at Single Tournament', canonicalPath: '/records/most-titles-at-single-tournament' },
  { slug: ['same', 'titles'], filters: { level: ['G'] }, title: 'Most Titles at Single Grand Slam Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['M'] }, title: 'Most Titles at Single Masters 1000 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['F'] }, title: 'Most Titles at Single ATP Finals Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['250'] }, title: 'Most Titles at Single ATP 250 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['500'] }, title: 'Most Titles at Single ATP 500 Tournament' },
  { slug: ['same', 'titles'], filters: { surface: ['Hard'] }, title: 'Most Titles at Single Hard Court Tournament' },
  { slug: ['same', 'titles'], filters: { surface: ['Clay'] }, title: 'Most Titles at Single Clay Court Tournament' },
  { slug: ['same', 'titles'], filters: { surface: ['Grass'] }, title: 'Most Titles at Single Grass Court Tournament' },
  { slug: ['same', 'titles'], filters: { surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court Tournament' },
  // level + surface combinations
  { slug: ['same', 'titles'], filters: { level: ['G'], surface: ['Hard'] }, title: 'Most Titles at Single Hard Court Grand Slam Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['G'], surface: ['Clay'] }, title: 'Most Titles at Single Clay Court Grand Slam Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['G'], surface: ['Grass'] }, title: 'Most Titles at Single Grass Court Grand Slam Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['G'], surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court Grand Slam Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['M'], surface: ['Hard'] }, title: 'Most Titles at Single Hard Court Masters 1000 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['M'], surface: ['Clay'] }, title: 'Most Titles at Single Clay Court Masters 1000 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['M'], surface: ['Grass'] }, title: 'Most Titles at Single Grass Court Masters 1000 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['M'], surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court Masters 1000 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['F'], surface: ['Hard'] }, title: 'Most Titles at Single Hard Court ATP Finals Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['F'], surface: ['Clay'] }, title: 'Most Titles at Single Clay Court ATP Finals Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['F'], surface: ['Grass'] }, title: 'Most Titles at Single Grass Court ATP Finals Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['F'], surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court ATP Finals Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['250'], surface: ['Hard'] }, title: 'Most Titles at Single Hard Court ATP 250 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['250'], surface: ['Clay'] }, title: 'Most Titles at Single Clay Court ATP 250 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['250'], surface: ['Grass'] }, title: 'Most Titles at Single Grass Court ATP 250 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['250'], surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court ATP 250 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['500'], surface: ['Hard'] }, title: 'Most Titles at Single Hard Court ATP 500 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['500'], surface: ['Clay'] }, title: 'Most Titles at Single Clay Court ATP 500 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['500'], surface: ['Grass'] }, title: 'Most Titles at Single Grass Court ATP 500 Tournament' },
  { slug: ['same', 'titles'], filters: { level: ['500'], surface: ['Carpet'] }, title: 'Most Titles at Single Carpet Court ATP 500 Tournament' },

  // --- same/round ------------------------------------------------------------
  { slug: ['same', 'round'], filters: { round: 'QF' }, title: 'Most Quarterfinals at Single Tournament' },
  { slug: ['same', 'round'], filters: { round: 'SF' }, title: 'Most Semifinals at Single Tournament' },
  { slug: ['same', 'round'], filters: { round: 'F' }, title: 'Most Finals at Single Tournament' },

  // --- same/round (level + round) -------------------------------------------
  { slug: ['same', 'round'], filters: { level: ['G'], round: 'QF' }, title: 'Most Quarterfinals in a Single Grand Slam Tournament' },
  { slug: ['same', 'round'], filters: { level: ['G'], round: 'SF' }, title: 'Most Semifinals in a Single Grand Slam Tournament' },
  { slug: ['same', 'round'], filters: { level: ['G'], round: 'F' }, title: 'Most Finals in a Single Grand Slam Tournament' },
  { slug: ['same', 'round'], filters: { level: ['M'], round: 'QF' }, title: 'Most Quarterfinals in a Single Masters 1000 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['M'], round: 'SF' }, title: 'Most Semifinals in a Single Masters 1000 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['M'], round: 'F' }, title: 'Most Finals in a Single Masters 1000 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['F'], round: 'QF' }, title: 'Most Quarterfinals in a Single ATP Finals Tournament' },
  { slug: ['same', 'round'], filters: { level: ['F'], round: 'SF' }, title: 'Most Semifinals in a Single ATP Finals Tournament' },
  { slug: ['same', 'round'], filters: { level: ['F'], round: 'F' }, title: 'Most Finals in a Single ATP Finals Tournament' },
  { slug: ['same', 'round'], filters: { level: ['250'], round: 'QF' }, title: 'Most Quarterfinals in a Single ATP 250 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['250'], round: 'SF' }, title: 'Most Semifinals in a Single ATP 250 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['250'], round: 'F' }, title: 'Most Finals in a Single ATP 250 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['500'], round: 'QF' }, title: 'Most Quarterfinals in a Single ATP 500 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['500'], round: 'SF' }, title: 'Most Semifinals in a Single ATP 500 Tournament' },
  { slug: ['same', 'round'], filters: { level: ['500'], round: 'F' }, title: 'Most Finals in a Single ATP 500 Tournament' },

  // --- same/round (surface + round) -----------------------------------------
  { slug: ['same', 'round'], filters: { surface: ['Hard'], round: 'QF' }, title: 'Most Quarterfinals at Single Hard Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Hard'], round: 'SF' }, title: 'Most Semifinals at Single Hard Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Hard'], round: 'F' }, title: 'Most Finals at Single Hard Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Clay'], round: 'QF' }, title: 'Most Quarterfinals at Single Clay Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Clay'], round: 'SF' }, title: 'Most Semifinals at Single Clay Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Clay'], round: 'F' }, title: 'Most Finals at Single Clay Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Grass'], round: 'QF' }, title: 'Most Quarterfinals at Single Grass Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Grass'], round: 'SF' }, title: 'Most Semifinals at Single Grass Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Grass'], round: 'F' }, title: 'Most Finals at Single Grass Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Carpet'], round: 'QF' }, title: 'Most Quarterfinals at Single Carpet Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Carpet'], round: 'SF' }, title: 'Most Semifinals at Single Carpet Court Tournament' },
  { slug: ['same', 'round'], filters: { surface: ['Carpet'], round: 'F' }, title: 'Most Finals at Single Carpet Court Tournament' },

  // --- seasons/wins ----------------------------------------------------------
  { slug: ['seasons', 'wins'], filters: {}, title: 'Most Wins in Single Season', canonicalPath: '/records/most-wins-in-single-season' },
  { slug: ['seasons', 'wins'], filters: { level: ['G'] }, title: 'Most Grand Slam Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { level: ['M'] }, title: 'Most Masters 1000 Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { level: ['F'] }, title: 'Most ATP Finals Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { level: ['250'] }, title: 'Most ATP 250 Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { level: ['500'] }, title: 'Most ATP 500 Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { bestOf: 3 }, title: 'Most Best of 3 Match Wins in a Single Season' },
  { slug: ['seasons', 'wins'], filters: { bestOf: 5 }, title: 'Most Best of 5 Match Wins in a Single Season' },

  // --- seasons/played --------------------------------------------------------
  { slug: ['seasons', 'played'], filters: {}, title: 'Most Matches Played in Single Season', canonicalPath: '/records/most-matches-played-in-single-season' },
  { slug: ['seasons', 'played'], filters: { level: ['G'] }, title: 'Most Grand Slam Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { level: ['M'] }, title: 'Most Masters 1000 Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { level: ['F'] }, title: 'Most ATP Finals Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { level: ['250'] }, title: 'Most ATP 250 Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { level: ['500'] }, title: 'Most ATP 500 Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { level: ['D'] }, title: 'Most Davis Cup Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { bestOf: 3 }, title: 'Most Best of 3 Matches Played in a Single Season' },
  { slug: ['seasons', 'played'], filters: { bestOf: 5 }, title: 'Most Best of 5 Matches Played in a Single Season' },

  // --- seasons/entries -------------------------------------------------------
  { slug: ['seasons', 'entries'], filters: {}, title: 'Most Tournament Appearances in Single Season', canonicalPath: '/records/most-tournament-appearances-in-single-season' },
  { slug: ['seasons', 'entries'], filters: { level: ['G'] }, title: 'Most Grand Slam Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { level: ['M'] }, title: 'Most Masters 1000 Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { level: ['F'] }, title: 'Most ATP Finals Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { level: ['250'] }, title: 'Most ATP 250 Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { level: ['500'] }, title: 'Most ATP 500 Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { bestOf: 3 }, title: 'Most Best of 3 Appearances in a Single Season' },
  { slug: ['seasons', 'entries'], filters: { bestOf: 5 }, title: 'Most Best of 5 Appearances in a Single Season' },

  // --- seasons/titles --------------------------------------------------------
  { slug: ['seasons', 'titles'], filters: {}, title: 'Most Titles in Single Season', canonicalPath: '/records/most-titles-in-single-season' },
  { slug: ['seasons', 'titles'], filters: { level: ['G'] }, title: 'Most Grand Slam Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { level: ['M'] }, title: 'Most Masters 1000 Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { level: ['F'] }, title: 'Most ATP Finals Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { level: ['250'] }, title: 'Most ATP 250 Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { level: ['500'] }, title: 'Most ATP 500 Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Titles in a Single Season' },
  { slug: ['seasons', 'titles'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Titles in a Single Season' },

  // --- seasons/round ---------------------------------------------------------
  { slug: ['seasons', 'round'], filters: { round: 'QF' }, title: 'Most Quarterfinals in a Single Season' },
  { slug: ['seasons', 'round'], filters: { round: 'SF' }, title: 'Most Semifinals in a Single Season' },
  { slug: ['seasons', 'round'], filters: { round: 'F' }, title: 'Most Finals in a Single Season', canonicalPath: '/records/most-finals-in-a-single-season' },

  // --- seasons/round (level + round) ----------------------------------------
  { slug: ['seasons', 'round'], filters: { level: ['G'], round: 'QF' }, title: 'Most Grand Slam Quarterfinals in a Single Season', canonicalPath: '/records/seasons/most-grand-slam-quarterfinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['G'], round: 'SF' }, title: 'Most Grand Slam Semifinals in a Single Season' },
  { slug: ['seasons', 'round'], filters: { level: ['G'], round: 'F' }, title: 'Most Grand Slam Finals in a Single Season', canonicalPath: '/records/seasons/most-grand-slam-finals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['M'], round: 'QF' }, title: 'Most Masters 1000 Quarterfinals in a Single Season', canonicalPath: '/records/seasons/most-masters-1000-quarterfinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['250'], round: 'QF' }, title: 'Most ATP 250 Quarterfinals in a Single Season', canonicalPath: '/records/seasons/most-atp-250-quarterfinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['250'], round: 'SF' }, title: 'Most ATP 250 Semifinals in a Single Season', canonicalPath: '/records/seasons/most-atp-250-semifinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['250'], round: 'F' }, title: 'Most ATP 250 Finals in a Single Season', canonicalPath: '/records/seasons/most-atp-250-finals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['500'], round: 'QF' }, title: 'Most ATP 500 Quarterfinals in a Single Season', canonicalPath: '/records/seasons/most-atp-500-quarterfinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['500'], round: 'SF' }, title: 'Most ATP 500 Semifinals in a Single Season', canonicalPath: '/records/seasons/most-atp-500-semifinals-in-a-single-season' },
  { slug: ['seasons', 'round'], filters: { level: ['500'], round: 'F' }, title: 'Most ATP 500 Finals in a Single Season', canonicalPath: '/records/seasons/most-atp-500-finals-in-a-single-season' },

  // --- seasons/percentage ----------------------------------------------------
  { slug: ['seasons', 'percentage'], filters: {}, title: 'Best Win Percentage in Single Season', canonicalPath: '/records/best-win-percentage-in-single-season' },
  { slug: ['seasons', 'percentage'], filters: { level: ['G'] }, title: 'Best Win Percentage at Grand Slams in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { level: ['M'] }, title: 'Best Win Percentage at Masters 1000 in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { level: ['F'] }, title: 'Best Win Percentage at ATP Finals in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { level: ['250'] }, title: 'Best Win Percentage at ATP 250 in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { level: ['500'] }, title: 'Best Win Percentage at ATP 500 in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Hard'] }, title: 'Best Hard Court Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Clay'] }, title: 'Best Clay Court Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Grass'] }, title: 'Best Grass Court Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { surface: ['Carpet'] }, title: 'Best Carpet Court Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { round: 'QF' }, title: 'Best Quarterfinal Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { round: 'SF' }, title: 'Best Semifinal Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { round: 'F' }, title: 'Best Final Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { bestOf: 3 }, title: 'Best Best of 3 Win Percentage in a Single Season' },
  { slug: ['seasons', 'percentage'], filters: { bestOf: 5 }, title: 'Best Best of 5 Win Percentage in a Single Season' },

  // --- atage/wins ------------------------------------------------------------
  { slug: ['atage', 'wins'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Wins at a Given Age' },
  { slug: ['atage', 'wins'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Wins at a Given Age' },
  { slug: ['atage', 'wins'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Wins at a Given Age' },
  { slug: ['atage', 'wins'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Wins at a Given Age' },

  // --- atage/played ----------------------------------------------------------
  { slug: ['atage', 'played'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Matches Played at a Given Age' },
  { slug: ['atage', 'played'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Matches Played at a Given Age' },
  { slug: ['atage', 'played'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Matches Played at a Given Age' },
  { slug: ['atage', 'played'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Matches Played at a Given Age' },

  // --- atage/entries ---------------------------------------------------------
  { slug: ['atage', 'entries'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Appearances at a Given Age' },
  { slug: ['atage', 'entries'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Appearances at a Given Age' },
  { slug: ['atage', 'entries'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Appearances at a Given Age' },
  { slug: ['atage', 'entries'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Appearances at a Given Age' },

  // --- atage/titles ----------------------------------------------------------
  { slug: ['atage', 'titles'], filters: { surface: ['Hard'] }, title: 'Most Hard Court Titles at a Given Age' },
  { slug: ['atage', 'titles'], filters: { surface: ['Clay'] }, title: 'Most Clay Court Titles at a Given Age' },
  { slug: ['atage', 'titles'], filters: { surface: ['Grass'] }, title: 'Most Grass Court Titles at a Given Age' },
  { slug: ['atage', 'titles'], filters: { surface: ['Carpet'] }, title: 'Most Carpet Court Titles at a Given Age' },

  // --- ageofnth/wins ---------------------------------------------------------
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Hard'] }, title: 'Age of Nth Win on Hard Court' },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Clay'] }, title: 'Age of Nth Win on Clay' },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Grass'] }, title: 'Age of Nth Win on Grass' },
  { slug: ['ageofnth', 'wins'], filters: { surface: ['Carpet'] }, title: 'Age of Nth Win on Carpet' },

  // --- ageofnth/played -------------------------------------------------------
  { slug: ['ageofnth', 'played'], filters: { surface: ['Hard'] }, title: 'Age of Nth Match Played on Hard Court' },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Clay'] }, title: 'Age of Nth Match Played on Clay' },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Grass'] }, title: 'Age of Nth Match Played on Grass' },
  { slug: ['ageofnth', 'played'], filters: { surface: ['Carpet'] }, title: 'Age of Nth Match Played on Carpet' },

  // --- ageofnth/entries ------------------------------------------------------
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Hard'] }, title: 'Age of Nth Appearance on Hard Court' },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Clay'] }, title: 'Age of Nth Appearance on Clay' },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Grass'] }, title: 'Age of Nth Appearance on Grass' },
  { slug: ['ageofnth', 'entries'], filters: { surface: ['Carpet'] }, title: 'Age of Nth Appearance on Carpet' },

  // --- ageofnth/titles -------------------------------------------------------
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Hard'] }, title: 'Age of Nth Title on Hard Court' },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Clay'] }, title: 'Age of Nth Title on Clay' },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Grass'] }, title: 'Age of Nth Title on Grass' },
  { slug: ['ageofnth', 'titles'], filters: { surface: ['Carpet'] }, title: 'Age of Nth Title on Carpet' },

  // --- neededto/titles -------------------------------------------------------
  { slug: ['neededto', 'titles'], filters: { level: ['G'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['M'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['F'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['250'] } },
  { slug: ['neededto', 'titles'], filters: { level: ['500'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['neededto', 'titles'], filters: { surface: ['Carpet'] } },

  // --- counterseasons/wins ---------------------------------------------------
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

  // --- counterseasons/titles -------------------------------------------------
  { slug: ['counterseasons', 'titles'], filters: { level: ['G'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['M'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['250'] } },
  { slug: ['counterseasons', 'titles'], filters: { level: ['500'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Hard'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Clay'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Grass'] } },
  { slug: ['counterseasons', 'titles'], filters: { surface: ['Carpet'] } },

  // --- counterseasons/round --------------------------------------------------
  { slug: ['counterseasons', 'round'], filters: { round: 'QF' } },
  { slug: ['counterseasons', 'round'], filters: { round: 'SF' } },
  { slug: ['counterseasons', 'round'], filters: { round: 'F' } },

  // --- h2h/count -------------------------------------------------------------
  { slug: ['h2h', 'count'], filters: {}, title: 'Most Played Head-to-Head', canonicalPath: '/records/most-played-h2h' },
  { slug: ['h2h', 'count'], filters: { level: ['G'] }, title: 'Most Head-to-Head Matches at Grand Slams' },
  { slug: ['h2h', 'count'], filters: { level: ['M'] }, title: 'Most Head-to-Head Matches at Masters 1000' },
  { slug: ['h2h', 'count'], filters: { level: ['F'] }, title: 'Most Head-to-Head Matches at ATP Finals' },
  { slug: ['h2h', 'count'], filters: { level: ['250'] }, title: 'Most Head-to-Head Matches at ATP 250' },
  { slug: ['h2h', 'count'], filters: { level: ['500'] }, title: 'Most Head-to-Head Matches at ATP 500' },
  { slug: ['h2h', 'count'], filters: { level: ['D'] }, title: 'Most Head-to-Head Davis Cup Matches' },
  { slug: ['h2h', 'count'], filters: { surface: ['Hard'] }, title: 'Most Head-to-Head Matches on Hard Court' },
  { slug: ['h2h', 'count'], filters: { surface: ['Clay'] }, title: 'Most Head-to-Head Matches on Clay' },
  { slug: ['h2h', 'count'], filters: { surface: ['Grass'] }, title: 'Most Head-to-Head Matches on Grass' },
  { slug: ['h2h', 'count'], filters: { surface: ['Carpet'] }, title: 'Most Head-to-Head Matches on Carpet' },
  { slug: ['h2h', 'count'], filters: { round: 'QF' }, title: 'Most Head-to-Head Quarterfinal Matches' },
  { slug: ['h2h', 'count'], filters: { round: 'SF' }, title: 'Most Head-to-Head Semifinal Matches' },
  { slug: ['h2h', 'count'], filters: { round: 'F' }, title: 'Most Head-to-Head Final Matches' },
  { slug: ['h2h', 'count'], filters: { bestOf: 3 }, title: 'Most Head-to-Head Best of 3 Matches' },
  { slug: ['h2h', 'count'], filters: { bestOf: 5 }, title: 'Most Head-to-Head Best of 5 Matches' },

  // --- streak/wins -----------------------------------------------------------
  { slug: ['streak', 'wins'], filters: {}, title: 'Longest Winning Streak', canonicalPath: '/records/longest-winning-streak' },
  { slug: ['longest-win-streak'], filters: {}, canonicalPath: '/records/longest-win-streak' },
  { slug: ['streak', 'wins'], filters: { level: ['G'] }, title: 'Longest Winning Streak at Grand Slams' },
  { slug: ['streak', 'wins'], filters: { level: ['M'] }, title: 'Longest Winning Streak at Masters 1000' },
  { slug: ['streak', 'wins'], filters: { level: ['F'] }, title: 'Longest Winning Streak at ATP Finals' },
  { slug: ['streak', 'wins'], filters: { level: ['250'] }, title: 'Longest Winning Streak at ATP 250' },
  { slug: ['streak', 'wins'], filters: { level: ['500'] }, title: 'Longest Winning Streak at ATP 500' },
  { slug: ['streak', 'wins'], filters: { level: ['D'] }, title: 'Longest Davis Cup Winning Streak' },
  { slug: ['streak', 'wins'], filters: { surface: ['Hard'] }, title: 'Longest Winning Streak on Hard Court' },
  { slug: ['streak', 'wins'], filters: { surface: ['Clay'] }, title: 'Longest Winning Streak on Clay' },
  { slug: ['streak', 'wins'], filters: { surface: ['Grass'] }, title: 'Longest Winning Streak on Grass' },
  { slug: ['streak', 'wins'], filters: { surface: ['Carpet'] }, title: 'Longest Winning Streak on Carpet' },
  { slug: ['streak', 'wins'], filters: { round: 'QF' }, title: 'Longest Quarterfinal Winning Streak' },
  { slug: ['streak', 'wins'], filters: { round: 'SF' }, title: 'Longest Semifinal Winning Streak' },
  { slug: ['streak', 'wins'], filters: { round: 'F' }, title: 'Longest Final Winning Streak' },
  { slug: ['streak', 'wins'], filters: { bestOf: 3 }, title: 'Longest Winning Streak Best of 3' },
  { slug: ['streak', 'wins'], filters: { bestOf: 5 }, title: 'Longest Winning Streak Best of 5' },

  // --- streak/round ----------------------------------------------------------
  { slug: ['streak', 'round'], filters: { round: 'QF' }, title: 'Longest Streak of Consecutive Quarterfinals' },
  { slug: ['streak', 'round'], filters: { round: 'SF' }, title: 'Longest Streak of Consecutive Semifinals' },
  { slug: ['streak', 'round'], filters: { round: 'F' }, title: 'Longest Streak of Consecutive Finals' },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'QF' }, title: 'Longest Streak of Consecutive Grand Slam Quarterfinals' },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'SF' }, title: 'Longest Streak of Consecutive Grand Slam Semifinals' },
  { slug: ['streak', 'round'], filters: { level: ['G'], round: 'F' }, title: 'Longest Streak of Consecutive Grand Slam Finals' },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'QF' }, title: 'Longest Streak of Consecutive Masters 1000 Quarterfinals' },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'SF' }, title: 'Longest Streak of Consecutive Masters 1000 Semifinals' },
  { slug: ['streak', 'round'], filters: { level: ['M'], round: 'F' }, title: 'Longest Streak of Consecutive Masters 1000 Finals' },
  { slug: ['streak', 'round'], filters: { level: ['F'], round: 'QF' }, title: 'Longest Streak of Consecutive ATP Finals Quarterfinals' },
  { slug: ['streak', 'round'], filters: { level: ['F'], round: 'SF' }, title: 'Longest Streak of Consecutive ATP Finals Semifinals' },
  { slug: ['streak', 'round'], filters: { level: ['F'], round: 'F' }, title: 'Longest Streak of Consecutive ATP Finals Final' },
  { slug: ['streak', 'round'], filters: { level: ['250'], round: 'QF' }, title: 'Longest Streak of Consecutive ATP 250 Quarterfinals' },
  { slug: ['streak', 'round'], filters: { level: ['250'], round: 'SF' }, title: 'Longest Streak of Consecutive ATP 250 Semifinals' },
  { slug: ['streak', 'round'], filters: { level: ['250'], round: 'F' }, title: 'Longest Streak of Consecutive ATP 250 Finals' },
  { slug: ['streak', 'round'], filters: { level: ['500'], round: 'QF' }, title: 'Longest Streak of Consecutive ATP 500 Quarterfinals' },
  { slug: ['streak', 'round'], filters: { level: ['500'], round: 'SF' }, title: 'Longest Streak of Consecutive ATP 500 Semifinals' },
  { slug: ['streak', 'round'], filters: { level: ['500'], round: 'F' }, title: 'Longest Streak of Consecutive ATP 500 Finals' },
  // surface + round combinations
  { slug: ['streak', 'round'], filters: { surface: ['Hard'], round: 'QF' }, canonicalPath: '/records/longest-streak-of-consecutive-quarterfinals-on-hard' },
  { slug: ['streak', 'round'], filters: { surface: ['Hard'], round: 'SF' }, canonicalPath: '/records/longest-streak-of-consecutive-semifinals-on-hard' },
  { slug: ['streak', 'round'], filters: { surface: ['Hard'], round: 'F' }, canonicalPath: '/records/longest-streak-of-consecutive-finals-on-hard' },
  { slug: ['streak', 'round'], filters: { surface: ['Clay'], round: 'QF' }, canonicalPath: '/records/longest-streak-of-consecutive-quarterfinals-on-clay' },
  { slug: ['streak', 'round'], filters: { surface: ['Clay'], round: 'SF' }, canonicalPath: '/records/longest-streak-of-consecutive-semifinals-on-clay' },
  { slug: ['streak', 'round'], filters: { surface: ['Clay'], round: 'F' }, canonicalPath: '/records/longest-streak-of-consecutive-finals-on-clay' },
  { slug: ['streak', 'round'], filters: { surface: ['Grass'], round: 'QF' }, canonicalPath: '/records/longest-streak-of-consecutive-quarterfinals-on-grass' },
  { slug: ['streak', 'round'], filters: { surface: ['Grass'], round: 'SF' }, canonicalPath: '/records/longest-streak-of-consecutive-semifinals-on-grass' },
  { slug: ['streak', 'round'], filters: { surface: ['Grass'], round: 'F' }, canonicalPath: '/records/longest-streak-of-consecutive-finals-on-grass' },
  { slug: ['streak', 'round'], filters: { surface: ['Carpet'], round: 'QF' }, canonicalPath: '/records/longest-streak-of-consecutive-quarterfinals-on-carpet' },
  { slug: ['streak', 'round'], filters: { surface: ['Carpet'], round: 'SF' }, canonicalPath: '/records/longest-streak-of-consecutive-semifinals-on-carpet' },
  { slug: ['streak', 'round'], filters: { surface: ['Carpet'], round: 'F' }, canonicalPath: '/records/longest-streak-of-consecutive-finals-on-carpet' },
];

const WHITELIST = WHITELIST_RAW.filter(entry => ALLOWED_RECORDS_CANONICAL_PATHS.has(buildWhitelistCanonicalPath(entry)));
const CANONICAL_ALIAS_ENTRIES = WHITELIST_RAW.filter(entry => entry.canonicalPath);

/** Stable lookup key: `/records/<slug>?<canonical-qs>` */
function makeWlKey(slug: string[], filters: RecordFilters): string {
  const qs = buildCanonicalQueryString(filters);
  return `/records/${slug.join('/')}${qs ? `?${qs}` : ''}`;
}

/** Map from key ? entry for O(1) lookup */
for (const entry of WHITELIST) {
  const canonicalPath = buildWhitelistCanonicalPath(entry);
  if (canonicalPath) {
    WHITELIST_CANONICAL_PATH_MAP.set(canonicalPath, entry);
  }
}

const WHITELIST_MAP = new Map<string, WhitelistEntry>(
  WHITELIST.map(e => [makeWlKey(e.slug, e.filters), e]),
);

const CANONICAL_ALIAS_MAP = new Map<string, WhitelistEntry>(
  CANONICAL_ALIAS_ENTRIES.map(e => [makeWlKey(e.slug, e.filters), e]),
);

const CANONICAL_ALIAS_MAP_BY_CANONICAL_PATH = new Map<string, WhitelistEntry>(
  CANONICAL_ALIAS_ENTRIES.map(e => [e.canonicalPath!, e]),
);

/** All whitelist keys (useful for sitemap generation) */
export const WHITELIST_KEYS: readonly string[] = [...WHITELIST_MAP.keys()];

/** Exported for use in sitemap.ts */
export const WHITELIST_ENTRIES: readonly WhitelistEntry[] = WHITELIST;

// --- Filter counting ----------------------------------------------------------

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

// --- Policy evaluation --------------------------------------------------------

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

  // Special rule: if the sub-tab segment is 'round'/'rounds' but no ?round= filter
  // is active the page shows all rounds with no specific focus ? always noindex.
  const subSeg = slug[slug.length - 1];
  const subIsRound = slug.length > 1 && (subSeg === 'round' || subSeg === 'rounds');
  if (RECORDS_NOINDEX_ENABLED && subIsRound && !filters.round) {
    return {
      index: false,
      follow: true,
      isWhitelisted: false,
      canonical,
      filterCount,
      inSitemap: false,
    };
  }

  // Index rule:
  //  · RECORDS_NOINDEX_ENABLED = false ? index everything
  //  · 0 filters    ? always index (no-filter pages)
  //  · 1+ filters   ? noindex unless whitelisted
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

// --- Title helper -------------------------------------------------------------

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

// --- Robots meta helper -------------------------------------------------------

/**
 * Returns the Next.js `robots` metadata object for a /records page.
 * noindex pages keep follow=true so Googlebot can still follow links to whitelisted/canonical pages.
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

// --- Sitemap entries helper ---------------------------------------------------

/**
 * Generate the set of /records paths with query strings that must be included
 * in the sitemap (base paths + whitelisted filtered pages).
 *
 * Base paths (no filters) that are already in the static `staticRoutes` array
 * inside sitemap.ts are listed here for reference but the caller should
 * de-duplicate.
 */
export function getWhitelistedSitemapPaths(siteOrigin: string): string[] {
  return WHITELIST.map(e => {
    const canonical = buildWhitelistCanonicalPath(e);
    if (canonical) return canonical;
    const qs = buildCanonicalQueryString(e.filters);
    const path = `/records/${e.slug.join('/')}`;
    return qs ? `${path}?${qs}` : path;
  });
}
