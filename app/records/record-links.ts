import { buildCanonicalQueryString, getCanonicalPathForAliasEntry, getCanonicalPathForWhitelistEntry, type RecordFilters } from '../../lib/seo/records-policy';

export function buildContextualRecordsPath(tab: string, sub?: string | null): string {
  const pathTab = tab === 'count' ? 'rounds' : tab;
  const segments = sub ? [pathTab, sub] : [pathTab];
  return `/records/${segments.map(encodeURIComponent).join('/')}`;
}

export function buildRecordFilters(
  selectedSurfaces: string[],
  selectedLevels: string[],
  selectedRounds?: string,
  selectedBestOf?: number | null,
): RecordFilters {
  const filters: RecordFilters = {};
  if (selectedLevels.length) filters.level = selectedLevels.map(v => String(v).toUpperCase());
  if (selectedSurfaces.length) filters.surface = selectedSurfaces.map(v => String(v).charAt(0).toUpperCase() + String(v).slice(1).toLowerCase());
  if (selectedRounds) filters.round = String(selectedRounds).toUpperCase();
  if (selectedBestOf != null) filters.bestOf = selectedBestOf;
  return filters;
}

export function resolveRecordHref(
  slug: string[],
  filters: RecordFilters = {},
  options: {
    currentPath?: string;
  } = {},
): string {
  const aliasCanonical = getCanonicalPathForAliasEntry(slug, filters);
  if (aliasCanonical) return aliasCanonical;

  const canonical = getCanonicalPathForWhitelistEntry(slug, filters);
  if (canonical) return canonical;

  const [tab, sub] = slug;
  const basePath = buildContextualRecordsPath(tab, sub);
  const qs = buildCanonicalQueryString(filters);
  return qs ? `${basePath}?${qs}` : basePath;
}

export function resolveCanonicalRecordHref(slug: string[], filters: RecordFilters = {}): string | null {
  return getCanonicalPathForWhitelistEntry(slug, filters);
}
