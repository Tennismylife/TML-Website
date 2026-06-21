function kebabToKey(s) {
  if (!s) return undefined;
  if (s.includes('-')) {
    return s
      .split('-')
      .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
  }
  return s;
}

function hasAnyParam(searchParams, names) {
  for (const name of names) {
    const values = searchParams.getAll(name).filter((value) => value !== '');
    if (values.length > 0) return true;
  }
  return false;
}

function shouldShowRecordFilter(filter, activeTab, activeSubTab) {
  const isSeasonsOrSame = activeTab === 'same' || activeTab === 'seasons';
  const isAtAgeLike = activeTab === 'atage' || activeTab === 'ageofnth';
  const hideRoundAndBestOfSubtabs = ['oldest', 'youngest', 'oldestWinners', 'youngestWinners'];

  if (activeTab === 'percentage') return true;
  if (activeTab === 'h2h' && activeSubTab === 'count') return true;
  if (activeTab === 'ages' && filter === 'bestOf') return false;

  if (activeTab === 'streak' && activeSubTab === 'wins') return true;
  if (activeTab === 'streak' && activeSubTab === 'round') {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (activeTab === 'ages' && (activeSubTab === 'oldest' || activeSubTab === 'youngest')) {
    return ['levels', 'surfaces', 'rounds'].includes(filter);
  }

  if (
    ['wins', 'played'].includes(activeTab || '') ||
    activeTab === 'ages' ||
    (activeTab === 'seasons' && ['wins', 'played', 'percentage'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['wins', 'played'].includes(activeSubTab || ''))
  ) {
    if (hideRoundAndBestOfSubtabs.includes(activeSubTab || '') && (filter === 'rounds' || filter === 'bestOf')) return false;
    return true;
  }

  if (
    ['entries', 'titles'].includes(activeTab || '') ||
    (isSeasonsOrSame && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (isAtAgeLike && ['entries', 'titles'].includes(activeSubTab || '')) ||
    (activeTab === 'neededto' && activeSubTab === 'titles')
  ) {
    return ['levels', 'surfaces'].includes(filter);
  }

  if (activeTab === 'count') return ['levels', 'surfaces', 'rounds'].includes(filter);

  if (activeTab === 'timespan') {
    if (['entries', 'titles'].includes(activeSubTab || '')) return ['levels', 'surfaces'].includes(filter);
    if (activeSubTab === 'rounds') return ['levels', 'surfaces', 'rounds'].includes(filter);
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

  if (activeTab === 'counterseasons' && activeSubTab === 'round') return ['levels', 'surfaces', 'rounds'].includes(filter);
  if (activeTab === 'counterseasons' && activeSubTab === 'titles') return ['levels', 'surfaces'].includes(filter);
  if (activeTab === 'counterseasons' && activeSubTab === 'wins') return ['levels', 'surfaces', 'bestOf', 'rounds'].includes(filter);

  return false;
}

function pruneDisallowedFilterParams(params, record, sub) {
  const remove = [];

  if (!shouldShowRecordFilter('levels', record, sub)) remove.push('level', 'level[]');
  if (!shouldShowRecordFilter('surfaces', record, sub)) remove.push('surface', 'surface[]');
  if (!shouldShowRecordFilter('rounds', record, sub)) remove.push('round', 'round[]');
  if (!shouldShowRecordFilter('bestOf', record, sub)) remove.push('bestOf', 'bestOf[]', 'best_of', 'best_of[]');

  for (const k of remove) params.delete(k);
}

const EXISTING_RECORDS_API_BASE = new Set([
  'wins', 'played', 'titles', 'entries', 'count', 'percentage',
]);

const EXISTING_RECORDS_API_SUBPATHS = {
  ages: new Set(['winners', 'maindraw']),
  atage: new Set(['wins', 'played', 'entries', 'titles', 'inslams', 'rounds', 'count']),
  ageofnth: new Set(['wins', 'played', 'entries', 'titles', 'inslams', 'rounds']),
  counterseasons: new Set(['wins', 'titles', 'rounds']),
  firstn: new Set(['count']),
  h2h: new Set(['count', 'timespan', 'seasons', 'sametournament']),
  least: new Set(['sets', 'minutes', 'gameslost', 'breaks', 'breakpoints']),
  neededto: new Set(['titles', 'rounds']),
  roundsonentries: new Set(['titles', 'rounds']),
  same: new Set(['wins', 'played', 'entries', 'titles', 'rounds', 'count']),
  seasons: new Set(['wins', 'played', 'entries', 'titles', 'rounds', 'percentage']),
  sets: new Set(['count', 'deciders', 'down2to1', 'lost1st', 'lost1st2nd', 'matches', 'split1st2nd', 'straights', 'up2to1', 'won1st', 'won1st2nd']),
  streak: new Set(['wins', 'rounds', 'streakwins', 'streaktournaments']),
  timespan: new Set(['entries', 'titles', 'rounds']),
};

function isExistingRecordApiPath(pathname) {
  const seg = String(pathname || '').split('/').filter(Boolean);
  if (seg.length < 3 || seg.length > 4) return false;
  if (seg[0] !== 'api' || seg[1] !== 'records') return false;

  const record = seg[2];
  const sub = seg[3];

  if (!sub) return EXISTING_RECORDS_API_BASE.has(record);
  return !!(EXISTING_RECORDS_API_SUBPATHS[record] && EXISTING_RECORDS_API_SUBPATHS[record].has(sub));
}

const RECORD_FILTER_PARAMS = ['level', 'level[]', 'surface', 'surface[]', 'round', 'round[]', 'bestOf', 'bestOf[]'];

function hasRecordsFilterParams(searchParams) {
  return hasAnyParam(searchParams, RECORD_FILTER_PARAMS);
}

function resolvePageRecordAndSub(pathname) {
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length < 2 || seg[0] !== 'records') return { record: null, sub: undefined };
  return { record: seg[1] || null, sub: kebabToKey(seg[2]) };
}

function resolveRecordApiRequest(record, sub, searchParams) {
  const params = new URLSearchParams(searchParams);
  const pageSub = sub || kebabToKey(params.get('subtab'));
  let apiSub = pageSub;

  // Legacy query params are page-level routing controls, not API filters.
  params.delete('subtab');
  params.delete('record');

  if (record === 'ages') {
    if (pageSub === 'oldest' || pageSub === 'youngest') {
      apiSub = 'maindraw';
      params.set('type', pageSub);
    } else if (pageSub === 'oldestWinners' || pageSub === 'youngestWinners') {
      apiSub = 'winners';
      params.set('type', pageSub === 'youngestWinners' ? 'youngest' : 'oldest');
    }
  }

  const subMap = {
    round: 'rounds',
    slam: 'inslams',
    slams: 'inslams',
  };

  if (apiSub) apiSub = subMap[apiSub] || apiSub;

  // Fixed rule: only keep filter params that are allowed by page filter policy.
  pruneDisallowedFilterParams(params, record, pageSub);

  // Normalize common page-level aliases to API-required parameter names.
  if (record === 'neededto' && apiSub === 'titles') {
    if (!params.get('maxTitles')) {
      const n = params.get('n') || params.get('seasons');
      if (n) params.set('maxTitles', String(n));
    }
  }
  if (record === 'neededto' && apiSub === 'rounds') {
    if (!params.get('round_number')) {
      const n = params.get('n') || params.get('seasons');
      if (n) params.set('round_number', String(n));
    }
  }

  // Drop filters that are not valid for specific API endpoints.
  // This keeps internal server-side checks from generating redirect-only API calls.
  const dropKeys = (keys) => {
    for (const k of keys) params.delete(k);
  };

  if (record === 'counterseasons' && apiSub === 'titles') {
    dropKeys(['round', 'round[]', 'bestOf', 'bestOf[]', 'best_of', 'best_of[]']);
  }

  if (record === 'counterseasons' && apiSub === 'rounds') {
    dropKeys(['bestOf', 'bestOf[]', 'best_of', 'best_of[]']);
  }

  return {
    pathname: `/api/records/${record}${apiSub ? `/${apiSub}` : ''}`,
    searchParams: params,
  };
}

function hasMissingRequiredRecordParams(record, sub, searchParams) {
  const normSub = sub || kebabToKey(searchParams.get('subtab'));

  if (record === 'atage') {
    const hasAge = !!String(searchParams.get('age') || '').trim();
    if (normSub === 'round' || normSub === 'rounds') {
      const hasRound = !!String(searchParams.get('round') || '').trim();
      return !hasAge || !hasRound;
    }
    if (['wins', 'played', 'entries', 'titles', 'slam', 'slams', 'inslams'].includes(normSub || '')) {
      return !hasAge;
    }
  }

  if (record === 'ageofnth') {
    const hasN = !!String(searchParams.get('n') || '').trim();
    if (normSub === 'round' || normSub === 'rounds') {
      const hasRound = !!String(searchParams.get('round') || '').trim();
      return !hasN || !hasRound;
    }
    if (['wins', 'played', 'entries', 'titles', 'slam', 'slams', 'inslams'].includes(normSub || '')) {
      return !hasN;
    }
  }

  if (record === 'timespan' && (normSub === 'round' || normSub === 'rounds')) {
    const hasRound = !!String(searchParams.get('round') || '').trim();
    return !hasRound;
  }

  if (record === 'neededto') {
    if (normSub === 'titles') {
      const val = String(searchParams.get('maxTitles') || searchParams.get('n') || searchParams.get('seasons') || '').trim();
      if (!val) return true;
      const n = Number(val);
      return !Number.isFinite(n) || n <= 0;
    }
    if (normSub === 'round' || normSub === 'rounds') {
      const val = String(searchParams.get('round_number') || searchParams.get('n') || searchParams.get('seasons') || '').trim();
      if (!val) return true;
      const n = Number(val);
      return !Number.isFinite(n) || n <= 0;
    }
  }

  return false;
}

function hasEmptyRecordData(payload) {
  if (Array.isArray(payload)) return payload.length === 0;
  if (!payload || typeof payload !== 'object') return false;

  const arrayValues = Object.values(payload).filter(Array.isArray);
  if (arrayValues.length === 0) return false;

  return arrayValues.every((value) => value.length === 0);
}

module.exports = {
  hasRecordsFilterParams,
  resolvePageRecordAndSub,
  resolveRecordApiRequest,
  isExistingRecordApiPath,
  hasMissingRequiredRecordParams,
  hasEmptyRecordData,
};
