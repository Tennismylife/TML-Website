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

const EXISTING_RECORDS_API_BASE = new Set([
  'wins', 'played', 'titles', 'entries', 'count', 'percentage',
]);

const EXISTING_RECORDS_API_SUBPATHS = {
  ages: new Set(['winners', 'allrounds', 'maindraw']),
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
  let apiSub = sub || kebabToKey(params.get('subtab'));

  // Legacy query params are page-level routing controls, not API filters.
  params.delete('subtab');
  params.delete('record');

  if (record === 'ages') {
    if (sub === 'oldest' || sub === 'youngest') {
      apiSub = 'maindraw';
      params.set('type', sub);
    } else if (sub === 'oldestWinners' || sub === 'youngestWinners') {
      apiSub = 'winners';
      params.set('type', sub === 'youngestWinners' ? 'youngest' : 'oldest');
    }
  }

  const subMap = {
    round: 'rounds',
    slam: 'inslams',
    slams: 'inslams',
  };

  if (apiSub) apiSub = subMap[apiSub] || apiSub;

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