import React from 'react';
import { metadataBase } from '../../lib/site';

interface Props {
  activeTab: string | null | undefined;
  activeSubTab?: string | null | undefined;
  searchParams?: Record<string, string | string[] | undefined>;
}

const SURFACE_LIST = ["Hard", "Clay", "Grass", "Carpet"];
const ROUND_LIST = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];
const BEST_OF_LIST = [3, 5, 1];

// small helpers ported from the client version so the server component renders
// identical link URLs and visibility rules.
function buildCanonicalPath(tab: string | null | undefined) {
  return `/records/${encodeURIComponent(tab || '')}`;
}

function canonicalizeParams(params: URLSearchParams) {
  const map = new Map<string, string[]>();
  for (const [k, v] of params.entries()) {
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(v);
  }
  const parts: string[] = [];
  const keys = Array.from(map.keys()).sort();
  for (const k of keys) {
    const vals = map.get(k)!.slice().sort();
    for (const v of vals) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join("&");
}

function buildSearch(selectedSurfaces: string[], selectedLevels: string[], selectedRounds?: string, selectedBestOf?: number | null) {
  const params = new URLSearchParams();
  selectedSurfaces.forEach(s => params.append('surface', s));
  selectedLevels.forEach(l => params.append('level', l));
  if (selectedRounds) params.set('round', selectedRounds);
  if (selectedBestOf !== null && selectedBestOf !== undefined) params.set('bestOf', String(selectedBestOf));
  const canon = canonicalizeParams(params);
  return canon;
}

export default function RecordsFilters({ activeTab, activeSubTab, searchParams = {} }: Props) {
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));

  // Normalize subtab: accept prop (camelCase) or fallback to query param (kebab-case -> camelCase)
  const kebabToKey = (s: string | undefined) => {
    if (!s) return s;
    return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
  };
  const effectiveSub = activeSubTab || (typeof searchParams.subtab === 'string' ? kebabToKey(String(searchParams.subtab)) : undefined);

  const selectedSurfaces = new Set(toArray(searchParams.surface ?? searchParams['surface[]']));
  const selectedLevels = new Set(toArray(searchParams.level ?? searchParams['level[]']));
  const selectedRounds = typeof searchParams.round === 'string' ? String(searchParams.round) : '';
  const selectedBestOf = searchParams.bestOf ? Number(searchParams.bestOf as string) : null;

  const surfaceEmojis: Record<string, string> = {
    Hard: "🟦",
    Clay: "🟧",
    Grass: "🟩",
    Carpet: "🟪",
  };

  const levelList = ['G','M','F','A','250','500','D'];
  const levelNames: Record<string, string> = {
    G: 'Grand Slam',
    M: 'Masters 1000',
    F: 'ATP Finals',
    500: '500',
    250: '250',
    A: 'Others',
    D: 'Davis Cup',
  };

  const isSeasonsOrSame = activeTab === 'same' || activeTab === 'seasons';
  const isAtAgeLike = activeTab === 'atage' || activeTab === 'ageofnth';
  const hideRoundAndBestOfSubtabs = ['oldest','youngest','oldestWinners','youngestWinners'];

  const shouldShowFilter = (filter: 'levels' | 'rounds' | 'bestOf' | 'surfaces') => {
    // Percentage → tutti i filtri attivi
    if (activeTab === 'percentage') return true;

    // H2H Count → tutti i filtri attivi
    if (activeTab === 'h2h' && activeSubTab === 'count') return true;

    // Ages → disable bestOf filter in all Ages subtabs
    if (activeTab === 'ages' && filter === 'bestOf') return false;

    // Streak → wins
    if (activeTab === 'streak' && activeSubTab === 'wins') return true;

    // Streak → round
    if (activeTab === 'streak' && activeSubTab === 'round') {
      return ['levels', 'surfaces', 'rounds'].includes(filter);
    }

    // Ages → oldest / youngest
    if (activeTab === 'ages' && (activeSubTab === 'oldest' || activeSubTab === 'youngest')) {
      return ['levels', 'surfaces', 'rounds'].includes(filter);
    }

    // Wins, Played, Ages, Percentage → tutti i filtri visibili (eccetto subtab che nascondono round/bestOf)
    if (
      ['wins','played'].includes(activeTab || '') || 
      activeTab === 'ages' || 
      (activeTab === 'seasons' && ['wins','played','percentage'].includes(activeSubTab || '')) ||
      (isAtAgeLike && ['wins','played'].includes(activeSubTab || ''))
    ) {
      if (hideRoundAndBestOfSubtabs.includes(activeSubTab || '') && (filter === 'rounds' || filter === 'bestOf')) return false;
      return true;
    }

    // Entries / Titles → Level e Surface
    if (
      ['entries','titles'].includes(activeTab || '') || 
      (isSeasonsOrSame && ['entries','titles'].includes(activeSubTab || '')) ||
      (isAtAgeLike && ['entries','titles'].includes(activeSubTab || '')) ||
      (activeTab === 'neededto' && activeSubTab === 'titles')
    ) {
      return ['levels','surfaces'].includes(filter);
    }

    // Count → Level, Surface, Round
    if (activeTab === 'count') {
      return ['levels','surfaces','rounds'].includes(filter);
    }

    // Timespan
    if (activeTab === 'timespan') {
      if (['entries','titles'].includes(activeSubTab || '')) return ['levels','surfaces'].includes(filter);
      if (activeSubTab === 'rounds') return ['levels','surfaces','rounds'].includes(filter);
    }

    // Roundsonentries
    if (activeTab === 'roundsonentries') {
      if (activeSubTab === 'titles') return ['levels','surfaces'].includes(filter);
      if (activeSubTab === 'round' ) return ['levels','surfaces','rounds'].includes(filter);
    }

    // Same / Seasons
    if (isSeasonsOrSame) {
      if (['wins','played','percentage'].includes(activeSubTab || '')) return true;
      if (['entries','titles'].includes(activeSubTab || '')) return ['levels','surfaces'].includes(filter);
      if (activeSubTab === 'round' ) return ['levels','surfaces','rounds'].includes(filter);
    }

    // ATAge / AgeOfNth
    if (isAtAgeLike) {
      if (['entries','titles'].includes(activeSubTab || '')) return ['levels','surfaces'].includes(filter);
      if (['slam','slams'].includes(activeSubTab || '')) return ['surfaces','rounds'].includes(filter);
      if (activeSubTab === 'round' ) return ['levels','surfaces','rounds'].includes(filter);
    }

    // CounterSeasons → rounds subtab
    if (activeTab === 'counterseasons' && activeSubTab === 'round') {
      return ['levels','surfaces','rounds'].includes(filter);
    }

    // CounterSeasons → titles subtab
    if (activeTab === 'counterseasons' && activeSubTab === 'titles') {
      return ['levels','surfaces'].includes(filter);
    }

    return false;
  };

  const showLevels = shouldShowFilter('levels');
  const showRounds = shouldShowFilter('rounds');
  const showBestOf = shouldShowFilter('bestOf');
  const showSurfaces = shouldShowFilter('surfaces');

  const showAllRounds = !(
    (isAtAgeLike && activeSubTab === 'round') ||
    (activeTab === 'same' && activeSubTab === 'round') ||
    (activeTab === 'seasons' && activeSubTab === 'round') ||
    (activeTab === 'timespan' && activeSubTab === 'rounds') ||
    (activeTab === 'roundsonentries' && activeSubTab === 'round') ||
    (activeTab === 'counterseasons' && activeSubTab === 'round') ||
    (activeTab === 'streak' && activeSubTab === 'round') ||
    activeTab === 'count'
  );

  const filteredLevelList = levelList.filter(l => {
    if (isAtAgeLike && activeSubTab === 'wins') return true;
    if (['count','entries','titles','timespan','roundsonentries','round','same'].includes(activeTab || '') && l === 'D') return false;
    return true;
  });

  return (
    <div className="mb-4 text-gray-100">
      {/* Surfaces */}
      {showSurfaces && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Surface</legend>
          <div className="flex flex-wrap gap-3">
            <a
              href={(() => {
                const params = buildSearch([], []);
                const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                const qs = [subParam, params].filter(Boolean).join('&');
                return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
              })()}
              className={`px-5 py-2 rounded-full font-medium ${selectedSurfaces.size === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
              All
            </a>
            {SURFACE_LIST.map(surface => (
              <a
                key={surface}
                href={(() => {
                  const params = buildSearch([surface], Array.from(selectedLevels));
                  const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                  const qs = [subParam, params].filter(Boolean).join('&');
                  return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
                })()}
                className={`px-5 py-2 rounded-full font-medium ${selectedSurfaces.has(surface) ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
                {surfaceEmojis[surface]} {surface}
              </a>
            ))}
          </div>
        </fieldset>
      )}

      {/* Levels */}
      {showLevels && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Level</legend>
          <div className="flex flex-wrap gap-3">
            <a
              href={(() => {
                const params = buildSearch([], []);
                const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                const qs = [subParam, params].filter(Boolean).join('&');
                return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
              })()}
              className={`px-5 py-2 rounded-full font-medium ${selectedLevels.size === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
              All
            </a>
            {filteredLevelList.map(level => (
              <a
                key={level}
                href={(() => {
                  const params = buildSearch(Array.from(selectedSurfaces), [level]);
                  const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                  const qs = [subParam, params].filter(Boolean).join('&');
                  return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
                })()}
                className={`px-5 py-2 rounded-full font-medium ${selectedLevels.has(level) ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
                {levelNames[level] || level}
              </a>
            ))}
          </div>
        </fieldset>
      )}

      {/* Rounds */}
      {showRounds && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Rounds</legend>
          <div className="flex flex-wrap gap-3">
            <a
              href={(() => {
                const params = buildSearch(Array.from(selectedSurfaces), Array.from(selectedLevels));
                const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                const qs = [subParam, params].filter(Boolean).join('&');
                return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
              })()}
              className={`px-5 py-2 rounded-full font-medium ${selectedRounds === '' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
              All
            </a>
            {ROUND_LIST.map(r => (
              <a
                key={r}
                href={(() => {
                  const params = buildSearch(Array.from(selectedSurfaces), Array.from(selectedLevels), r);
                  const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                  const qs = [subParam, params].filter(Boolean).join('&');
                  return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
                })()}
                className={`px-5 py-2 rounded-full font-medium ${selectedRounds === r ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
                {r}
              </a>
            ))}
          </div>
        </fieldset>
      )}

      {/* Best of */}
      {showBestOf && (
        <fieldset className="p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Best Of</legend>
          <div className="flex flex-wrap gap-3">
            <a
              href={(() => {
                const params = buildSearch(Array.from(selectedSurfaces), Array.from(selectedLevels));
                const subParam = effectiveSub ? `subtab=${encodeURIComponent(effectiveSub)}` : '';
                const qs = [subParam, params].filter(Boolean).join('&');
                return buildCanonicalPath(activeTab) + (qs ? `?${qs}` : '');
              })()}
              className={`px-5 py-2 rounded-full font-medium ${selectedBestOf === null ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
              All
            </a>
            {BEST_OF_LIST.map(b => (
              <a
                key={b}
                href={buildCanonicalPath(activeTab, activeSubTab) + (buildSearch(Array.from(selectedSurfaces), Array.from(selectedLevels), selectedRounds, b) ? `?${buildSearch(Array.from(selectedSurfaces), Array.from(selectedLevels), selectedRounds, b)}` : '')}
                className={`px-5 py-2 rounded-full font-medium ${selectedBestOf === b ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300'}`}>
                {b}
              </a>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
