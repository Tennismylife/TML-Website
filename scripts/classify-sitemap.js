/**
 * classify-sitemap.js
 *
 * Reads sitemap-deindex.xml and outputs sitemap-noindex-410.xml containing
 * only URLs that should be noindex or 410 (i.e. NOT in the whitelist and
 * NOT zero-filter pages).
 *
 * Classification rules:
 *  INDEX   (exclude) â†’ filterCount === 0  OR  URL is in the whitelist
 *  NOINDEX (include) â†’ filterCount > 0 AND not in whitelist AND all filters valid
 *  410     (include) â†’ at least one present filter is invalid for that record/sub
 */

const fs = require('fs');
const path = require('path');

// â”€â”€â”€ shouldShowRecordFilter (ported from lib/records/allowed-filters.ts) â”€â”€â”€â”€â”€â”€
function shouldShowRecordFilter(filter, activeTab, activeSubTab) {
  const isSeasonsOrSame = activeTab === 'same' || activeTab === 'seasons';
  const isAtAgeLike = activeTab === 'atage' || activeTab === 'ageofnth';
  const hideRoundAndBestOfSubtabs = ['oldest', 'youngest', 'oldestWinners', 'youngestWinners'];

  if (activeTab === 'percentage') return true;
  if (activeTab === 'h2h' && activeSubTab === 'count') return true;
  if (activeTab === 'ages' && filter === 'bestOf') return false;
  if (activeTab === 'streak' && activeSubTab === 'wins') return true;
  if (activeTab === 'streak' && activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  if (activeTab === 'ages' && (activeSubTab === 'oldest' || activeSubTab === 'youngest')) return ['levels', 'surfaces', 'rounds'].includes(filter);

  if (
    ['wins', 'played'].includes(activeTab) ||
    activeTab === 'ages' ||
    (activeTab === 'seasons' && ['wins', 'played', 'percentage'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['wins', 'played'].includes(activeSubTab || ''))
  ) {
    if (hideRoundAndBestOfSubtabs.includes(activeSubTab || '') && (filter === 'rounds' || filter === 'bestOf')) return false;
    return true;
  }

  if (
    ['entries', 'titles'].includes(activeTab) ||
    (isSeasonsOrSame && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (activeTab === 'neededto' && activeSubTab === 'titles')
  ) {
    return ['levels', 'surfaces'].includes(filter);
  }

  if (activeTab === 'count') return ['levels', 'surfaces', 'rounds'].includes(filter);

  if (activeTab === 'timespan') {
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'rounds' || activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (activeTab === 'roundsonentries') {
    if (activeSubTab === 'titles') return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (isSeasonsOrSame) {
    if (['wins', 'played', 'percentage'].includes(activeSubTab || '')) return true;
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (isAtAgeLike) {
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (['slam', 'slams'].includes(activeSubTab || '')) return ['surfaces', 'rounds'].includes(filter);
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (activeTab === 'counterseasons') {
    if (activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
    if (activeSubTab === 'titles') return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'wins') return ['levels', 'surfaces', 'bestOf', 'rounds'].includes(filter);
  }

  return false;
}

// â”€â”€â”€ kebabToKey (ported from middleware.ts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function kebabToKey(s) {
  if (!s) return undefined;
  if (s.includes('-')) {
    return s.split('-').map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)).join('');
  }
  return s;
}

// â”€â”€â”€ Canonical QS builder for whitelist key matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Order: level, surface, round, bestOf  (never subtab)
function buildCanonicalQS(params) {
  const parts = [];
  // Handle level (single param as appears in sitemap)
  const levels = params.getAll('level').filter(Boolean).sort();
  for (const v of levels) parts.push(`level=${v}`);
  const surfaces = params.getAll('surface').filter(Boolean).sort();
  for (const v of surfaces) parts.push(`surface=${v}`);
  const round = params.get('round');
  if (round) parts.push(`round=${round}`);
  const bestOf = params.get('bestOf');
  if (bestOf) parts.push(`bestOf=${bestOf}`);
  return parts.join('&');
}

// â”€â”€â”€ Whitelist  (ported from lib/seo/records-policy.ts WHITELIST_RAW) â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Helper to build whitelist key from slug array + filter object
function wl(slugArr, filters) {
  const parts = [];
  if (filters.level) {
    [...filters.level].sort().forEach(v => parts.push(`level=${v}`));
  }
  if (filters.surface) {
    [...filters.surface].sort().forEach(v => parts.push(`surface=${v}`));
  }
  if (filters.round) parts.push(`round=${filters.round}`);
  if (filters.bestOf != null) parts.push(`bestOf=${filters.bestOf}`);
  const qs = parts.join('&');
  return '/records/' + slugArr.join('/') + (qs ? '?' + qs : '');
}

const WHITELIST = new Set([
  // â”€â”€â”€ wins (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { level: ['G'] }), wl(['wins'], { level: ['M'] }), wl(['wins'], { level: ['F'] }),
  wl(['wins'], { level: ['250'] }), wl(['wins'], { level: ['500'] }), wl(['wins'], { level: ['D'] }),
  // â”€â”€â”€ wins (surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { surface: ['Hard'] }), wl(['wins'], { surface: ['Clay'] }),
  wl(['wins'], { surface: ['Grass'] }), wl(['wins'], { surface: ['Carpet'] }),
  // â”€â”€â”€ wins (round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { round: 'QF' }), wl(['wins'], { round: 'SF' }), wl(['wins'], { round: 'F' }),
  // â”€â”€â”€ wins (bestOf) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { bestOf: 3 }), wl(['wins'], { bestOf: 5 }),
  // â”€â”€â”€ wins (2-filter: level+round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { level: ['G'], round: 'F' }), wl(['wins'], { level: ['G'], round: 'SF' }), wl(['wins'], { level: ['G'], round: 'QF' }),
  wl(['wins'], { level: ['M'], round: 'QF' }), wl(['wins'], { level: ['M'], round: 'F' }),
  // â”€â”€â”€ wins (2-filter: level+surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { level: ['G'], surface: ['Clay'] }), wl(['wins'], { level: ['G'], surface: ['Grass'] }), wl(['wins'], { level: ['G'], surface: ['Hard'] }),
  wl(['wins'], { level: ['M'], surface: ['Hard'] }), wl(['wins'], { level: ['M'], surface: ['Clay'] }),
  // â”€â”€â”€ wins (3-filter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['wins'], { level: ['M'], surface: ['Clay'], bestOf: 3 }), wl(['wins'], { level: ['M'], surface: ['Hard'], bestOf: 3 }), wl(['wins'], { level: ['M'], surface: ['Carpet'], bestOf: 3 }),

  // â”€â”€â”€ played (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { level: ['G'] }), wl(['played'], { level: ['M'] }), wl(['played'], { level: ['F'] }),
  wl(['played'], { level: ['250'] }), wl(['played'], { level: ['500'] }), wl(['played'], { level: ['D'] }),
  // â”€â”€â”€ played (surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { surface: ['Hard'] }), wl(['played'], { surface: ['Clay'] }),
  wl(['played'], { surface: ['Grass'] }), wl(['played'], { surface: ['Carpet'] }),
  // â”€â”€â”€ played (round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { round: 'QF' }), wl(['played'], { round: 'SF' }), wl(['played'], { round: 'F' }),
  // â”€â”€â”€ played (bestOf) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { bestOf: 3 }), wl(['played'], { bestOf: 5 }),
  // â”€â”€â”€ played (2-filter: level+surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { level: ['G'], surface: ['Hard'] }), wl(['played'], { level: ['G'], surface: ['Clay'] }), wl(['played'], { level: ['G'], surface: ['Grass'] }),
  wl(['played'], { level: ['M'], surface: ['Hard'] }), wl(['played'], { level: ['M'], surface: ['Clay'] }), wl(['played'], { level: ['M'], surface: ['Carpet'] }),
  // â”€â”€â”€ played (3-filter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['played'], { level: ['M'], surface: ['Clay'], bestOf: 3 }), wl(['played'], { level: ['M'], surface: ['Hard'], bestOf: 3 }), wl(['played'], { level: ['M'], surface: ['Carpet'], bestOf: 3 }),

  // â”€â”€â”€ count (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€â”€ count (round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['count'], { round: 'QF' }), wl(['count'], { round: 'SF' }), wl(['count'], { round: 'F' }),
  // â”€â”€â”€ count (2-filter: level+round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // â”€â”€â”€ titles (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['titles'], { level: ['G'] }), wl(['titles'], { level: ['M'] }), wl(['titles'], { level: ['F'] }),
  wl(['titles'], { level: ['250'] }), wl(['titles'], { level: ['500'] }),
  // â”€â”€â”€ titles (surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['titles'], { surface: ['Hard'] }), wl(['titles'], { surface: ['Clay'] }),
  wl(['titles'], { surface: ['Grass'] }), wl(['titles'], { surface: ['Carpet'] }),
  // â”€â”€â”€ titles (2-filter: level+surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['titles'], { level: ['G'], surface: ['Clay'] }), wl(['titles'], { level: ['G'], surface: ['Grass'] }), wl(['titles'], { level: ['G'], surface: ['Hard'] }),
  wl(['titles'], { level: ['M'], surface: ['Hard'] }), wl(['titles'], { level: ['M'], surface: ['Clay'] }), wl(['titles'], { level: ['M'], surface: ['Carpet'] }),

  // â”€â”€â”€ entries (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['entries'], { level: ['G'] }), wl(['entries'], { level: ['M'] }), wl(['entries'], { level: ['F'] }),
  wl(['entries'], { level: ['250'] }), wl(['entries'], { level: ['500'] }),
  // â”€â”€â”€ entries (surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['entries'], { surface: ['Hard'] }), wl(['entries'], { surface: ['Clay'] }),
  wl(['entries'], { surface: ['Grass'] }), wl(['entries'], { surface: ['Carpet'] }),
  // â”€â”€â”€ entries (2-filter: level+surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['entries'], { level: ['G'], surface: ['Hard'] }), wl(['entries'], { level: ['G'], surface: ['Clay'] }), wl(['entries'], { level: ['G'], surface: ['Grass'] }),
  wl(['entries'], { level: ['M'], surface: ['Hard'] }), wl(['entries'], { level: ['M'], surface: ['Carpet'] }),

  // â”€â”€â”€ percentage (level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['percentage'], { level: ['G'] }), wl(['percentage'], { level: ['M'] }), wl(['percentage'], { level: ['F'] }),
  wl(['percentage'], { level: ['250'] }), wl(['percentage'], { level: ['500'] }),
  // â”€â”€â”€ percentage (surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['percentage'], { surface: ['Hard'] }), wl(['percentage'], { surface: ['Clay'] }),
  wl(['percentage'], { surface: ['Grass'] }), wl(['percentage'], { surface: ['Carpet'] }),
  // â”€â”€â”€ percentage (round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['percentage'], { round: 'QF' }), wl(['percentage'], { round: 'SF' }), wl(['percentage'], { round: 'F' }),
  // â”€â”€â”€ percentage (2-filter: level+surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['percentage'], { level: ['G'], surface: ['Clay'] }), wl(['percentage'], { level: ['G'], surface: ['Grass'] }),

  // â”€â”€â”€ ages/oldest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ages', 'oldest'], { level: ['G'] }), wl(['ages', 'oldest'], { level: ['M'] }), wl(['ages', 'oldest'], { level: ['F'] }),
  wl(['ages', 'oldest'], { level: ['250'] }), wl(['ages', 'oldest'], { level: ['500'] }), wl(['ages', 'oldest'], { level: ['D'] }),
  wl(['ages', 'oldest'], { surface: ['Hard'] }), wl(['ages', 'oldest'], { surface: ['Clay'] }),
  wl(['ages', 'oldest'], { surface: ['Grass'] }), wl(['ages', 'oldest'], { surface: ['Carpet'] }),
  wl(['ages', 'oldest'], { round: 'QF' }), wl(['ages', 'oldest'], { round: 'SF' }), wl(['ages', 'oldest'], { round: 'F' }),

  // â”€â”€â”€ ages/youngest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ages', 'youngest'], { level: ['G'] }), wl(['ages', 'youngest'], { level: ['M'] }), wl(['ages', 'youngest'], { level: ['F'] }),
  wl(['ages', 'youngest'], { level: ['250'] }), wl(['ages', 'youngest'], { level: ['500'] }), wl(['ages', 'youngest'], { level: ['D'] }),
  wl(['ages', 'youngest'], { surface: ['Hard'] }), wl(['ages', 'youngest'], { surface: ['Clay'] }),
  wl(['ages', 'youngest'], { surface: ['Grass'] }), wl(['ages', 'youngest'], { surface: ['Carpet'] }),
  wl(['ages', 'youngest'], { round: 'QF' }), wl(['ages', 'youngest'], { round: 'SF' }), wl(['ages', 'youngest'], { round: 'F' }),

  // â”€â”€â”€ ages/oldest-winners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ages', 'oldest-winners'], { level: ['G'] }), wl(['ages', 'oldest-winners'], { level: ['M'] }), wl(['ages', 'oldest-winners'], { level: ['F'] }),
  wl(['ages', 'oldest-winners'], { level: ['250'] }), wl(['ages', 'oldest-winners'], { level: ['500'] }),
  wl(['ages', 'oldest-winners'], { surface: ['Hard'] }), wl(['ages', 'oldest-winners'], { surface: ['Clay'] }),
  wl(['ages', 'oldest-winners'], { surface: ['Grass'] }), wl(['ages', 'oldest-winners'], { surface: ['Carpet'] }),

  // â”€â”€â”€ ages/youngest-winners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ages', 'youngest-winners'], { level: ['G'] }), wl(['ages', 'youngest-winners'], { level: ['M'] }), wl(['ages', 'youngest-winners'], { level: ['F'] }),
  wl(['ages', 'youngest-winners'], { level: ['250'] }), wl(['ages', 'youngest-winners'], { level: ['500'] }),
  wl(['ages', 'youngest-winners'], { surface: ['Hard'] }), wl(['ages', 'youngest-winners'], { surface: ['Clay'] }),
  wl(['ages', 'youngest-winners'], { surface: ['Grass'] }), wl(['ages', 'youngest-winners'], { surface: ['Carpet'] }),

  // â”€â”€â”€ timespan/entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['timespan', 'entries'], { level: ['G'] }), wl(['timespan', 'entries'], { level: ['M'] }), wl(['timespan', 'entries'], { level: ['F'] }),
  wl(['timespan', 'entries'], { level: ['250'] }), wl(['timespan', 'entries'], { level: ['500'] }),
  wl(['timespan', 'entries'], { surface: ['Hard'] }), wl(['timespan', 'entries'], { surface: ['Clay'] }),
  wl(['timespan', 'entries'], { surface: ['Grass'] }), wl(['timespan', 'entries'], { surface: ['Carpet'] }),

  // â”€â”€â”€ timespan/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['timespan', 'titles'], { level: ['G'] }), wl(['timespan', 'titles'], { level: ['M'] }), wl(['timespan', 'titles'], { level: ['F'] }),
  wl(['timespan', 'titles'], { level: ['250'] }), wl(['timespan', 'titles'], { level: ['500'] }),
  wl(['timespan', 'titles'], { surface: ['Hard'] }), wl(['timespan', 'titles'], { surface: ['Clay'] }),
  wl(['timespan', 'titles'], { surface: ['Grass'] }), wl(['timespan', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ timespan/rounds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['timespan', 'rounds'], { round: 'QF' }), wl(['timespan', 'rounds'], { round: 'SF' }), wl(['timespan', 'rounds'], { round: 'F' }),

  // â”€â”€â”€ timespan (base with round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['timespan'], { round: 'QF' }), wl(['timespan'], { round: 'SF' }), wl(['timespan'], { round: 'F' }),

  // â”€â”€â”€ roundsonentries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['roundsonentries'], { level: ['G'] }), wl(['roundsonentries'], { level: ['M'] }), wl(['roundsonentries'], { level: ['F'] }),
  wl(['roundsonentries'], { level: ['250'] }), wl(['roundsonentries'], { level: ['500'] }),

  // â”€â”€â”€ roundsonentries/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['roundsonentries', 'titles'], { level: ['G'] }), wl(['roundsonentries', 'titles'], { level: ['M'] }), wl(['roundsonentries', 'titles'], { level: ['F'] }),
  wl(['roundsonentries', 'titles'], { level: ['250'] }), wl(['roundsonentries', 'titles'], { level: ['500'] }),
  wl(['roundsonentries', 'titles'], { surface: ['Hard'] }), wl(['roundsonentries', 'titles'], { surface: ['Clay'] }),
  wl(['roundsonentries', 'titles'], { surface: ['Grass'] }), wl(['roundsonentries', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ roundsonentries/round â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['roundsonentries', 'round'], { round: 'QF' }), wl(['roundsonentries', 'round'], { round: 'SF' }), wl(['roundsonentries', 'round'], { round: 'F' }),

  // â”€â”€â”€ same/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['same', 'wins'], { level: ['G'] }), wl(['same', 'wins'], { level: ['M'] }), wl(['same', 'wins'], { level: ['F'] }),
  wl(['same', 'wins'], { level: ['250'] }), wl(['same', 'wins'], { level: ['500'] }),
  wl(['same', 'wins'], { surface: ['Hard'] }), wl(['same', 'wins'], { surface: ['Clay'] }),
  wl(['same', 'wins'], { surface: ['Grass'] }), wl(['same', 'wins'], { surface: ['Carpet'] }),
  wl(['same', 'wins'], { bestOf: 3 }), wl(['same', 'wins'], { bestOf: 5 }),

  // â”€â”€â”€ same/played â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['same', 'played'], { level: ['G'] }), wl(['same', 'played'], { level: ['M'] }), wl(['same', 'played'], { level: ['F'] }),
  wl(['same', 'played'], { level: ['250'] }), wl(['same', 'played'], { level: ['500'] }),
  wl(['same', 'played'], { surface: ['Hard'] }), wl(['same', 'played'], { surface: ['Clay'] }),
  wl(['same', 'played'], { surface: ['Grass'] }), wl(['same', 'played'], { surface: ['Carpet'] }),
  wl(['same', 'played'], { bestOf: 3 }), wl(['same', 'played'], { bestOf: 5 }),

  // â”€â”€â”€ same/entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['same', 'entries'], { level: ['G'] }), wl(['same', 'entries'], { level: ['M'] }), wl(['same', 'entries'], { level: ['F'] }),
  wl(['same', 'entries'], { level: ['250'] }), wl(['same', 'entries'], { level: ['500'] }),
  wl(['same', 'entries'], { surface: ['Hard'] }), wl(['same', 'entries'], { surface: ['Clay'] }),
  wl(['same', 'entries'], { surface: ['Grass'] }), wl(['same', 'entries'], { surface: ['Carpet'] }),

  // â”€â”€â”€ same/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['same', 'titles'], { level: ['G'] }), wl(['same', 'titles'], { level: ['M'] }), wl(['same', 'titles'], { level: ['F'] }),
  wl(['same', 'titles'], { level: ['250'] }), wl(['same', 'titles'], { level: ['500'] }),
  wl(['same', 'titles'], { surface: ['Hard'] }), wl(['same', 'titles'], { surface: ['Clay'] }),
  wl(['same', 'titles'], { surface: ['Grass'] }), wl(['same', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ same/round â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['same', 'round'], { round: 'QF' }), wl(['same', 'round'], { round: 'SF' }), wl(['same', 'round'], { round: 'F' }),

  // â”€â”€â”€ seasons/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'wins'], { level: ['G'] }), wl(['seasons', 'wins'], { level: ['M'] }), wl(['seasons', 'wins'], { level: ['F'] }),
  wl(['seasons', 'wins'], { level: ['250'] }), wl(['seasons', 'wins'], { level: ['500'] }),
  wl(['seasons', 'wins'], { surface: ['Hard'] }), wl(['seasons', 'wins'], { surface: ['Clay'] }),
  wl(['seasons', 'wins'], { surface: ['Grass'] }), wl(['seasons', 'wins'], { surface: ['Carpet'] }),
  wl(['seasons', 'wins'], { bestOf: 3 }), wl(['seasons', 'wins'], { bestOf: 5 }),

  // â”€â”€â”€ seasons/played â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'played'], { level: ['G'] }), wl(['seasons', 'played'], { level: ['M'] }), wl(['seasons', 'played'], { level: ['F'] }),
  wl(['seasons', 'played'], { level: ['250'] }), wl(['seasons', 'played'], { level: ['500'] }), wl(['seasons', 'played'], { level: ['D'] }),
  wl(['seasons', 'played'], { surface: ['Hard'] }), wl(['seasons', 'played'], { surface: ['Clay'] }),
  wl(['seasons', 'played'], { surface: ['Grass'] }), wl(['seasons', 'played'], { surface: ['Carpet'] }),
  wl(['seasons', 'played'], { bestOf: 3 }), wl(['seasons', 'played'], { bestOf: 5 }),

  // â”€â”€â”€ seasons/entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'entries'], { level: ['G'] }), wl(['seasons', 'entries'], { level: ['M'] }), wl(['seasons', 'entries'], { level: ['F'] }),
  wl(['seasons', 'entries'], { level: ['250'] }), wl(['seasons', 'entries'], { level: ['500'] }),
  wl(['seasons', 'entries'], { surface: ['Hard'] }), wl(['seasons', 'entries'], { surface: ['Clay'] }),
  wl(['seasons', 'entries'], { surface: ['Grass'] }), wl(['seasons', 'entries'], { surface: ['Carpet'] }),
  wl(['seasons', 'entries'], { bestOf: 3 }), wl(['seasons', 'entries'], { bestOf: 5 }),

  // â”€â”€â”€ seasons/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'titles'], { level: ['G'] }), wl(['seasons', 'titles'], { level: ['M'] }), wl(['seasons', 'titles'], { level: ['F'] }),
  wl(['seasons', 'titles'], { level: ['250'] }), wl(['seasons', 'titles'], { level: ['500'] }),
  wl(['seasons', 'titles'], { surface: ['Hard'] }), wl(['seasons', 'titles'], { surface: ['Clay'] }),
  wl(['seasons', 'titles'], { surface: ['Grass'] }), wl(['seasons', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ seasons/round â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'round'], { round: 'QF' }), wl(['seasons', 'round'], { round: 'SF' }), wl(['seasons', 'round'], { round: 'F' }),

  // â”€â”€â”€ seasons/percentage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['seasons', 'percentage'], { level: ['G'] }), wl(['seasons', 'percentage'], { level: ['M'] }), wl(['seasons', 'percentage'], { level: ['F'] }),
  wl(['seasons', 'percentage'], { level: ['250'] }), wl(['seasons', 'percentage'], { level: ['500'] }),
  wl(['seasons', 'percentage'], { surface: ['Hard'] }), wl(['seasons', 'percentage'], { surface: ['Clay'] }),
  wl(['seasons', 'percentage'], { surface: ['Grass'] }), wl(['seasons', 'percentage'], { surface: ['Carpet'] }),
  wl(['seasons', 'percentage'], { round: 'QF' }), wl(['seasons', 'percentage'], { round: 'SF' }), wl(['seasons', 'percentage'], { round: 'F' }),
  wl(['seasons', 'percentage'], { bestOf: 3 }), wl(['seasons', 'percentage'], { bestOf: 5 }),

  // â”€â”€â”€ atage/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['atage', 'wins'], { surface: ['Hard'] }), wl(['atage', 'wins'], { surface: ['Clay'] }),
  wl(['atage', 'wins'], { surface: ['Grass'] }), wl(['atage', 'wins'], { surface: ['Carpet'] }),

  // â”€â”€â”€ atage/played â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['atage', 'played'], { surface: ['Hard'] }), wl(['atage', 'played'], { surface: ['Clay'] }),
  wl(['atage', 'played'], { surface: ['Grass'] }), wl(['atage', 'played'], { surface: ['Carpet'] }),

  // â”€â”€â”€ atage/entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['atage', 'entries'], { surface: ['Hard'] }), wl(['atage', 'entries'], { surface: ['Clay'] }),
  wl(['atage', 'entries'], { surface: ['Grass'] }), wl(['atage', 'entries'], { surface: ['Carpet'] }),

  // â”€â”€â”€ atage/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['atage', 'titles'], { surface: ['Hard'] }), wl(['atage', 'titles'], { surface: ['Clay'] }),
  wl(['atage', 'titles'], { surface: ['Grass'] }), wl(['atage', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ ageofnth/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ageofnth', 'wins'], { surface: ['Hard'] }), wl(['ageofnth', 'wins'], { surface: ['Clay'] }),
  wl(['ageofnth', 'wins'], { surface: ['Grass'] }), wl(['ageofnth', 'wins'], { surface: ['Carpet'] }),

  // â”€â”€â”€ ageofnth/played â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ageofnth', 'played'], { surface: ['Hard'] }), wl(['ageofnth', 'played'], { surface: ['Clay'] }),
  wl(['ageofnth', 'played'], { surface: ['Grass'] }), wl(['ageofnth', 'played'], { surface: ['Carpet'] }),

  // â”€â”€â”€ ageofnth/entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ageofnth', 'entries'], { surface: ['Hard'] }), wl(['ageofnth', 'entries'], { surface: ['Clay'] }),
  wl(['ageofnth', 'entries'], { surface: ['Grass'] }), wl(['ageofnth', 'entries'], { surface: ['Carpet'] }),

  // â”€â”€â”€ ageofnth/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['ageofnth', 'titles'], { surface: ['Hard'] }), wl(['ageofnth', 'titles'], { surface: ['Clay'] }),
  wl(['ageofnth', 'titles'], { surface: ['Grass'] }), wl(['ageofnth', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ neededto/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['neededto', 'titles'], { level: ['G'] }), wl(['neededto', 'titles'], { level: ['M'] }), wl(['neededto', 'titles'], { level: ['F'] }),
  wl(['neededto', 'titles'], { level: ['250'] }), wl(['neededto', 'titles'], { level: ['500'] }),
  wl(['neededto', 'titles'], { surface: ['Hard'] }), wl(['neededto', 'titles'], { surface: ['Clay'] }),
  wl(['neededto', 'titles'], { surface: ['Grass'] }), wl(['neededto', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ counterseasons/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['counterseasons', 'wins'], { level: ['G'] }), wl(['counterseasons', 'wins'], { level: ['M'] }), wl(['counterseasons', 'wins'], { level: ['F'] }),
  wl(['counterseasons', 'wins'], { level: ['250'] }), wl(['counterseasons', 'wins'], { level: ['500'] }), wl(['counterseasons', 'wins'], { level: ['D'] }),
  wl(['counterseasons', 'wins'], { surface: ['Hard'] }), wl(['counterseasons', 'wins'], { surface: ['Clay'] }),
  wl(['counterseasons', 'wins'], { surface: ['Grass'] }), wl(['counterseasons', 'wins'], { surface: ['Carpet'] }),
  wl(['counterseasons', 'wins'], { round: 'QF' }), wl(['counterseasons', 'wins'], { round: 'SF' }), wl(['counterseasons', 'wins'], { round: 'F' }),
  wl(['counterseasons', 'wins'], { bestOf: 3 }), wl(['counterseasons', 'wins'], { bestOf: 5 }),

  // â”€â”€â”€ counterseasons/titles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['counterseasons', 'titles'], { level: ['G'] }), wl(['counterseasons', 'titles'], { level: ['M'] }),
  wl(['counterseasons', 'titles'], { level: ['250'] }), wl(['counterseasons', 'titles'], { level: ['500'] }),
  wl(['counterseasons', 'titles'], { surface: ['Hard'] }), wl(['counterseasons', 'titles'], { surface: ['Clay'] }),
  wl(['counterseasons', 'titles'], { surface: ['Grass'] }), wl(['counterseasons', 'titles'], { surface: ['Carpet'] }),

  // â”€â”€â”€ counterseasons/round â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['counterseasons', 'round'], { round: 'QF' }), wl(['counterseasons', 'round'], { round: 'SF' }), wl(['counterseasons', 'round'], { round: 'F' }),

  // â”€â”€â”€ h2h/count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['h2h', 'count'], { level: ['G'] }), wl(['h2h', 'count'], { level: ['M'] }), wl(['h2h', 'count'], { level: ['F'] }),
  wl(['h2h', 'count'], { level: ['250'] }), wl(['h2h', 'count'], { level: ['500'] }), wl(['h2h', 'count'], { level: ['D'] }),
  wl(['h2h', 'count'], { surface: ['Hard'] }), wl(['h2h', 'count'], { surface: ['Clay'] }),
  wl(['h2h', 'count'], { surface: ['Grass'] }), wl(['h2h', 'count'], { surface: ['Carpet'] }),
  wl(['h2h', 'count'], { round: 'QF' }), wl(['h2h', 'count'], { round: 'SF' }), wl(['h2h', 'count'], { round: 'F' }),
  wl(['h2h', 'count'], { bestOf: 3 }), wl(['h2h', 'count'], { bestOf: 5 }),

  // â”€â”€â”€ streak/wins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['streak', 'wins'], { level: ['G'] }), wl(['streak', 'wins'], { level: ['M'] }), wl(['streak', 'wins'], { level: ['F'] }),
  wl(['streak', 'wins'], { level: ['250'] }), wl(['streak', 'wins'], { level: ['500'] }), wl(['streak', 'wins'], { level: ['D'] }),
  wl(['streak', 'wins'], { surface: ['Hard'] }), wl(['streak', 'wins'], { surface: ['Clay'] }),
  wl(['streak', 'wins'], { surface: ['Grass'] }), wl(['streak', 'wins'], { surface: ['Carpet'] }),
  wl(['streak', 'wins'], { round: 'QF' }), wl(['streak', 'wins'], { round: 'SF' }), wl(['streak', 'wins'], { round: 'F' }),
  wl(['streak', 'wins'], { bestOf: 3 }), wl(['streak', 'wins'], { bestOf: 5 }),

  // â”€â”€â”€ streak/round â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wl(['streak', 'round'], { round: 'QF' }), wl(['streak', 'round'], { round: 'SF' }), wl(['streak', 'round'], { round: 'F' }),
  wl(['streak', 'round'], { level: ['G'], round: 'QF' }), wl(['streak', 'round'], { level: ['G'], round: 'SF' }), wl(['streak', 'round'], { level: ['G'], round: 'F' }),
  wl(['streak', 'round'], { level: ['M'], round: 'QF' }), wl(['streak', 'round'], { level: ['M'], round: 'SF' }), wl(['streak', 'round'], { level: ['M'], round: 'F' }),
]);

// â”€â”€â”€ URL parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Parse a records URL into components.
 * Returns: { record, pathSub, effectiveSub, params, filterCount, canonicalKey }
 *
 * effectiveSub = kebabToKey(pathSub || subtabParam) â€” used for filter validity checks
 * pathSub = raw path second segment â€” used for whitelist key lookup
 * canonicalKey = /records/{record}/{pathSub}?{canonical-qs} â€” used for whitelist lookup
 */
function parseRecordsUrl(href) {
  const url = new URL(href);
  const seg = url.pathname.split('/').filter(Boolean);
  // seg[0] = 'records', seg[1] = record, seg[2] = pathSub

  const record = seg[1] || null;
  const rawPathSub = seg[2] || null; // e.g. 'oldest-winners', 'oldestWinners', 'count', etc.

  // Effective sub: path sub takes precedence over ?subtab= query param
  const subtabParam = url.searchParams.get('subtab');
  const effectiveSub = kebabToKey(rawPathSub) || kebabToKey(subtabParam) || undefined;

  const params = url.searchParams;

  // Count filters (level, surface, round, bestOf â€” NOT subtab)
  const hasLevel = params.get('level') !== null;
  const hasSurface = params.get('surface') !== null;
  const hasRound = params.get('round') !== null;
  const hasBestOf = params.get('bestOf') !== null;
  const filterCount = [hasLevel, hasSurface, hasRound, hasBestOf].filter(Boolean).length;

  // Build canonical QS for whitelist lookup (level, surface, round, bestOf)
  const qs = buildCanonicalQS(params);

  // Whitelist key uses RAW path segments (not kebabToKey'd)
  const slugArr = rawPathSub ? [record, rawPathSub] : [record];
  const canonicalKey = `/records/${slugArr.join('/')}${qs ? '?' + qs : ''}`;

  return { record, rawPathSub, effectiveSub, params, filterCount, canonicalKey, hasLevel, hasSurface, hasRound, hasBestOf };
}

/**
 * Returns 'index' | 'noindex' | '410'
 */
function classify(href) {
  let parsed;
  try {
    parsed = parseRecordsUrl(href);
  } catch {
    return 'noindex'; // malformed URL â€“ keep in deindex sitemap
  }

  const { record, effectiveSub, filterCount, canonicalKey, hasLevel, hasSurface, hasRound, hasBestOf, params } = parsed;

  if (!record) return filterCount === 0 ? 'index' : 'noindex'; // /records root

  // Check for invalid filters â†’ 410
  const filterChecks = [
    { present: hasLevel, filter: 'levels' },
    { present: hasSurface, filter: 'surfaces' },
    { present: hasRound, filter: 'rounds' },
    { present: hasBestOf, filter: 'bestOf' },
  ];

  const hasInvalidFilter = filterChecks.some(({ present, filter }) =>
    present && !shouldShowRecordFilter(filter, record, effectiveSub)
  );

  if (hasInvalidFilter) return '410';

  // No filters â†’ index (exclude from deindex sitemap)
  if (filterCount === 0) return 'index';
  // Special rule: sub-tab is 'round'/'rounds' but no ?round= filter → noindex
  const subIsRound = !!parsed.rawPathSub && (parsed.rawPathSub === 'round' || parsed.rawPathSub === 'rounds');
  if (subIsRound && !hasRound) return 'noindex';
  // Check whitelist â†’ index
  if (WHITELIST.has(canonicalKey)) return 'index';

  // Valid filters, filterCount > 0, not whitelisted â†’ noindex
  return 'noindex';
}

// â”€â”€â”€ Main: parse sitemap and classify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inputPath = path.join(__dirname, 'sitemap-deindex.xml');
const outputPath = path.join(__dirname, 'sitemap-noindex-410.xml');

const xml = fs.readFileSync(inputPath, 'utf8');

// Simple regex extraction of <loc> values
const locRegex = /<loc>([^<]+)<\/loc>/g;
const allUrls = [];
let m;
while ((m = locRegex.exec(xml)) !== null) {
  // Decode XML entities
  const href = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  allUrls.push(href);
}

console.log(`Total URLs in input: ${allUrls.length}`);

const results = { index: [], noindex: [], '410': [] };

for (const href of allUrls) {
  const result = classify(href);
  results[result].push(href);
}

console.log(`  INDEX   (excluded): ${results.index.length}`);
console.log(`  NOINDEX (included): ${results.noindex.length}`);
console.log(`  410     (included): ${results['410'].length}`);

const deindexUrls = [...results.noindex, ...results['410']];
deindexUrls.sort();

// Write output sitemap
const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
];

for (const href of deindexUrls) {
  const escaped = href.replace(/&/g, '&amp;');
  lines.push(`  <url>`);
  lines.push(`    <loc>${escaped}</loc>`);
  lines.push(`  </url>`);
}

lines.push('</urlset>');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log(`\nOutput written to: ${outputPath}`);
console.log(`Total deindex URLs: ${deindexUrls.length}`);

// Optional: write a breakdown file
const breakdownPath = path.join(__dirname, 'sitemap-noindex-410-breakdown.txt');
const bLines = [];
bLines.push('=== NOINDEX URLs ===\n');
for (const href of results.noindex.sort()) bLines.push(href);
bLines.push('\n=== 410 URLs ===\n');
for (const href of results['410'].sort()) bLines.push(href);
bLines.push('\n=== INDEX (whitelisted or zero-filter) ===\n');
for (const href of results.index.sort()) bLines.push(href);
fs.writeFileSync(breakdownPath, bLines.join('\n'), 'utf8');
console.log(`Breakdown written to: ${breakdownPath}`);

