/**
 * lib/records/allowed-filters.ts
 *
 * Shared utility: determines which filter types are valid for a given records page.
 * This logic mirrors the shouldShowFilter function in RecordsFilters.server.tsx
 * and FiltersComponent.tsx. Keep all three in sync.
 */

export type FilterName = 'levels' | 'rounds' | 'bestOf' | 'surfaces';

/**
 * Returns true if the given filter type is applicable to the specified
 * record + sub-tab combination.
 *
 * Used for:
 *  1. Showing/hiding filter controls in the UI
 *  2. Returning 404 when an inapplicable filter is present in the URL
 */
export function shouldShowRecordFilter(
  filter: FilterName,
  activeTab: string | null | undefined,
  activeSubTab?: string | null | undefined,
): boolean {
  const isSeasonsOrSame = activeTab === 'same' || activeTab === 'seasons';
  const isAtAgeLike = activeTab === 'atage' || activeTab === 'ageofnth';
  const hideRoundAndBestOfSubtabs = ['oldest', 'youngest', 'oldestWinners', 'youngestWinners'];

  // Percentage → all filters active
  if (activeTab === 'percentage') return true;

  // H2H Count → all filters active
  if (activeTab === 'h2h' && activeSubTab === 'count') return true;

  // Ages → bestOf is never valid
  if (activeTab === 'ages' && filter === 'bestOf') return false;

  // Streak → wins
  if (activeTab === 'streak' && activeSubTab === 'wins') return true;

  // Streak → round
  if (activeTab === 'streak' && activeSubTab === 'round') {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // Ages → oldest / youngest (main draw – round filter applies)
  if (activeTab === 'ages' && (activeSubTab === 'oldest' || activeSubTab === 'youngest')) {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // Wins, Played, Ages (other subtabs) → all filters unless subtab hides rounds/bestOf
  if (
    ['wins', 'played'].includes(activeTab || '') ||
    activeTab === 'ages' ||
    (activeTab === 'seasons' && ['wins', 'played', 'percentage'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['wins', 'played'].includes(activeSubTab || ''))
  ) {
    if (hideRoundAndBestOfSubtabs.includes(activeSubTab || '') && (filter === 'rounds' || filter === 'bestOf')) return false;
    return true;
  }

  // Entries / Titles → level and surface only
  if (
    ['entries', 'titles'].includes(activeTab || '') ||
    (isSeasonsOrSame && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (activeTab === 'neededto' && activeSubTab === 'titles')
  ) {
    return ['levels', 'surfaces'].includes(filter);
  }

  // Count → level, surface, round
  if (activeTab === 'count') {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // Timespan
  if (activeTab === 'timespan') {
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'rounds' || activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // Roundsonentries
  if (activeTab === 'roundsonentries') {
    if (activeSubTab === 'titles') return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // Same / Seasons
  if (isSeasonsOrSame) {
    if (['wins', 'played', 'percentage'].includes(activeSubTab || '')) return true;
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // AtAge / AgeOfNth
  if (isAtAgeLike) {
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (['slam', 'slams'].includes(activeSubTab || '')) return ['surfaces', 'rounds'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // CounterSeasons → round subtab
  if (activeTab === 'counterseasons' && activeSubTab === 'round') {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  // CounterSeasons → titles subtab
  if (activeTab === 'counterseasons' && activeSubTab === 'titles') {
    return ['levels', 'surfaces'].includes(filter);
  }

  // CounterSeasons → wins subtab
  if (activeTab === 'counterseasons' && activeSubTab === 'wins') {
    return ['levels', 'surfaces', 'bestOf', 'rounds'].includes(filter);
  }

  return false;
}
