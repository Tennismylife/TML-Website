/**
 * lib/seo/records-policy.ts
 *
 * Centralised SEO policy for /records/* pages.
 *
 * Rules
 * ──────────────────────────────────────────────────────────────────────────
 * 1. /records/*  with NO filter params  → index, follow
 * 2. exactly 1 filter                   → index, follow
 * 3. 2+ filters                         → noindex, follow  (default)
 *    EXCEPT whitelist entries           → index, follow (treated as rule 2)
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
 * Set to true to re-enable rule 3 (2+ filters → noindex).
 * While false every /records page is indexed regardless of filter count.
 */
export const RECORDS_NOINDEX_ENABLED = false;

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
  // ── Existing entries ────────────────────────────────────────────────────────
  {
    slug: ['ages', 'oldest-winners'],
    filters: { level: ['F'] },
    title: 'Oldest ATP Finals Title Winners of All Time',
  },
  {
    slug: ['played'],
    filters: { level: ['M'] },
    title: 'Most Matches Played at Masters 1000 – All-Time Records',
  },
  {
    slug: ['played'],
    filters: { level: ['F'] },
    title: 'Most Matches Played at ATP Finals – All-Time Records',
  },
  {
    slug: ['played'],
    filters: { round: 'F' },
    title: 'Most Finals Played – ATP All-Time Records',
  },
  {
    slug: ['ages', 'youngest-winners'],
    filters: { level: ['M'] },
    title: 'Youngest Masters 1000 Title Winners of All Time',
  },
  {
    slug: ['count'],
    filters: { level: ['M'], round: 'QF' },
    title: 'Most Masters 1000 Quarterfinals – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['M'], round: 'QF' },
    title: 'Most Wins in Masters 1000 Quarterfinals – All-Time ATP Records',
  },

  // ── Grand Slam (1 filter) ───────────────────────────────────────────────────
  // Highest search-volume ATP queries globally. Single-filter pages are already
  // indexed but excluded from sitemap by default — whitelist fixes both gaps.
  {
    slug: ['titles'],
    filters: { level: ['G'] },
    title: 'Most Grand Slam Titles – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['G'] },
    title: 'Most Grand Slam Match Wins – All-Time ATP Records',
  },
  {
    slug: ['played'],
    filters: { level: ['G'] },
    title: 'Most Matches Played at Grand Slams – All-Time ATP Records',
  },
  {
    slug: ['ages', 'youngest-winners'],
    filters: { level: ['G'] },
    title: 'Youngest Grand Slam Title Winners – All-Time ATP Records',
  },
  {
    slug: ['ages', 'oldest-winners'],
    filters: { level: ['G'] },
    title: 'Oldest Grand Slam Title Winners – All-Time ATP Records',
  },

  // ── Masters 1000 titles (1 filter) ─────────────────────────────────────────
  {
    slug: ['titles'],
    filters: { level: ['M'] },
    title: 'Most Masters 1000 Titles – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['M'] },
    title: 'Most Masters 1000 Match Wins – All-Time ATP Records',
  },

  // ── ATP Finals titles (1 filter) ───────────────────────────────────────────
  {
    slug: ['titles'],
    filters: { level: ['F'] },
    title: 'Most ATP Finals Titles – All-Time Records',
  },

  // ── Surface wins (1 filter) ────────────────────────────────────────────────
  // Clay: Nadal-effect; Grass: Federer/Wimbledon; Hard: Djokovic/Open era
  {
    slug: ['wins'],
    filters: { surface: ['Clay'] },
    title: 'Most Wins on Clay – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { surface: ['Grass'] },
    title: 'Most Wins on Grass – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { surface: ['Hard'] },
    title: 'Most Wins on Hard Court – All-Time ATP Records',
  },
  {
    slug: ['titles'],
    filters: { surface: ['Clay'] },
    title: 'Most Titles Won on Clay – All-Time ATP Records',
  },
  {
    slug: ['titles'],
    filters: { surface: ['Grass'] },
    title: 'Most Titles Won on Grass – All-Time ATP Records',
  },

  // ── Streak by surface (1 filter) ───────────────────────────────────────────
  // Nadal's 81-match clay streak is one of the most searched individual records
  {
    slug: ['streak', 'wins'],
    filters: { surface: ['Clay'] },
    title: 'Longest Winning Streak on Clay – All-Time ATP Records',
  },
  {
    slug: ['streak', 'wins'],
    filters: { surface: ['Grass'] },
    title: 'Longest Winning Streak on Grass – All-Time ATP Records',
  },

  // ── Grand Slam × Round (2 filters) ────────────────────────────────────────
  // Clear navigational intent: "who won the most Grand Slam finals / semifinals"
  {
    slug: ['wins'],
    filters: { level: ['G'], round: 'F' },
    title: 'Most Grand Slam Finals Won – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['G'], round: 'SF' },
    title: 'Most Grand Slam Semifinals Won – All-Time ATP Records',
  },
  {
    slug: ['count'],
    filters: { level: ['G'], round: 'QF' },
    title: 'Most Grand Slam Quarterfinals – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['G'], round: 'QF' },
    title: 'Most Wins in Grand Slam Quarterfinals – All-Time ATP Records',
  },

  // ── Finals record (round=F) × level (2 filters) ───────────────────────────
  {
    slug: ['wins'],
    filters: { level: ['M'], round: 'F' },
    title: 'Most Masters 1000 Finals Won – All-Time ATP Records',
  },
  {
    slug: ['count'],
    filters: { level: ['G'], round: 'SF' },
    title: 'Most Grand Slam Semifinal Appearances – All-Time ATP Records',
  },

  // ── Age records at Grand Slams × surface (2 filters) ──────────────────────
  {
    slug: ['ages', 'youngest-winners'],
    filters: { surface: ['Clay'] },
    title: 'Youngest Clay Court Title Winners – All-Time ATP Records',
  },
  {
    slug: ['ages', 'youngest-winners'],
    filters: { surface: ['Grass'] },
    title: 'Youngest Grass Court Title Winners – All-Time ATP Records',
  },

  // ── Win percentage (1 filter) ──────────────────────────────────────────────
  // "Best win percentage on clay" / "best win % at Grand Slams" → Nadal/Federer effect
  {
    slug: ['percentage'],
    filters: { level: ['G'] },
    title: 'Best Win Percentage at Grand Slams – All-Time ATP Records',
  },
  {
    slug: ['percentage'],
    filters: { level: ['M'] },
    title: 'Best Win Percentage at Masters 1000 – All-Time ATP Records',
  },
  {
    slug: ['percentage'],
    filters: { surface: ['Clay'] },
    title: 'Best Win Percentage on Clay – All-Time ATP Records',
  },
  {
    slug: ['percentage'],
    filters: { surface: ['Grass'] },
    title: 'Best Win Percentage on Grass – All-Time ATP Records',
  },
  {
    slug: ['percentage'],
    filters: { surface: ['Hard'] },
    title: 'Best Win Percentage on Hard Court – All-Time ATP Records',
  },

  // ── Titles on hard court (1 filter) ───────────────────────────────────────
  {
    slug: ['titles'],
    filters: { surface: ['Hard'] },
    title: 'Most Titles Won on Hard Court – All-Time ATP Records',
  },

  // ── Most entries at Grand Slams / Masters (1 filter) ──────────────────────
  // "How many Grand Slams did Federer play?" is highly searched
  {
    slug: ['entries'],
    filters: { level: ['G'] },
    title: 'Most Grand Slam Appearances – All-Time ATP Records',
  },
  {
    slug: ['entries'],
    filters: { level: ['M'] },
    title: 'Most Masters 1000 Appearances – All-Time ATP Records',
  },

  // ── Wins at QF / SF / F (1 filter, round only) ────────────────────────────
  // "Who won the most semifinals in ATP history?" — clear navigational intent
  {
    slug: ['wins'],
    filters: { round: 'SF' },
    title: 'Most Semifinals Won – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { round: 'QF' },
    title: 'Most Quarterfinals Won – All-Time ATP Records',
  },

  // ── Grand Slam final appearances count (2 filters) ────────────────────────
  // "How many Grand Slam finals did Djokovic/Federer/Nadal play?" — very Googled
  {
    slug: ['count'],
    filters: { level: ['G'], round: 'F' },
    title: 'Most Grand Slam Final Appearances – All-Time ATP Records',
  },

  // ── Streak on hard court (1 filter) ───────────────────────────────────────
  // Djokovic's hard-court dominance = recurring trivia query
  {
    slug: ['streak', 'wins'],
    filters: { surface: ['Hard'] },
    title: 'Longest Winning Streak on Hard Court – All-Time ATP Records',
  },

  // ── Streak at Grand Slams (1 filter) ──────────────────────────────────────
  {
    slug: ['streak', 'wins'],
    filters: { level: ['G'] },
    title: 'Longest Winning Streak at Grand Slams – All-Time ATP Records',
  },
  {
    slug: ['streak', 'wins'],
    filters: { level: ['M'] },
    title: 'Longest Winning Streak at Masters 1000 – All-Time ATP Records',
  },

  // ── Grand Slam titles × surface (2 filters) ───────────────────────────────
  // Effectively "most Roland Garros titles" / "most Wimbledon titles" — among
  // the most searched tennis trivia in English
  {
    slug: ['titles'],
    filters: { level: ['G'], surface: ['Clay'] },
    title: 'Most Roland Garros Titles – All-Time ATP Records',
  },
  {
    slug: ['titles'],
    filters: { level: ['G'], surface: ['Grass'] },
    title: 'Most Wimbledon Titles – All-Time ATP Records',
  },
  {
    slug: ['titles'],
    filters: { level: ['G'], surface: ['Hard'] },
    title: 'Most Hard Court Grand Slam Titles – All-Time ATP Records',
  },

  // ── Grand Slam wins × surface (2 filters) ─────────────────────────────────
  {
    slug: ['wins'],
    filters: { level: ['G'], surface: ['Clay'] },
    title: 'Most Match Wins at Roland Garros – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['G'], surface: ['Grass'] },
    title: 'Most Match Wins at Wimbledon – All-Time ATP Records',
  },
  {
    slug: ['wins'],
    filters: { level: ['G'], surface: ['Hard'] },
    title: 'Most Match Wins at Hard Court Grand Slams – All-Time ATP Records',
  },

  // ── Win % at Roland Garros / Wimbledon (2 filters) ────────────────────────
  // "Nadal win percentage Roland Garros" is consistently searched
  {
    slug: ['percentage'],
    filters: { level: ['G'], surface: ['Clay'] },
    title: 'Best Win Percentage at Roland Garros – All-Time ATP Records',
  },
  {
    slug: ['percentage'],
    filters: { level: ['G'], surface: ['Grass'] },
    title: 'Best Win Percentage at Wimbledon – All-Time ATP Records',
  },

  // ── Masters 1000 finals appearances (2 filters) ───────────────────────────
  {
    slug: ['count'],
    filters: { level: ['M'], round: 'F' },
    title: 'Most Masters 1000 Final Appearances – All-Time ATP Records',
  },

  // ── Timespan between Grand Slam titles (1 filter) ─────────────────────────
  // "Biggest gap between two Slam titles" → high trivia appeal
  {
    slug: ['timespan', 'titles'],
    filters: { level: ['G'] },
    title: 'Longest Gap Between Two Grand Slam Titles – All-Time ATP Records',
  },

  // ── Most Grand Slam titles in a single season (1 filter) ──────────────────
  // Federer 2006/2007 (3 Slams), Djokovic 2021 — very searched stat
  {
    slug: ['seasons', 'titles'],
    filters: { level: ['G'] },
    title: 'Most Grand Slam Titles in a Single Season – All-Time ATP Records',
  },
  {
    slug: ['seasons', 'wins'],
    filters: { level: ['G'] },
    title: 'Most Grand Slam Match Wins in a Single Season – All-Time ATP Records',
  },
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
  //  · 0 or 1 filter  → always index
  //  · 2+ filters      → noindex unless whitelisted
  const shouldIndex = !RECORDS_NOINDEX_ENABLED || filterCount <= 1 || isWhitelisted;

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
