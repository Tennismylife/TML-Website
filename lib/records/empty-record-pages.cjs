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
  hasMissingRequiredRecordParams,
  hasEmptyRecordData,
};