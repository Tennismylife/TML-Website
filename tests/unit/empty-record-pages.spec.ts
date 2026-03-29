/** @vitest-environment node */
import { describe, it, expect } from 'vitest';

const {
  hasRecordsFilterParams,
  resolvePageRecordAndSub,
  resolveRecordApiRequest,
  isExistingRecordApiPath,
  hasMissingRequiredRecordParams,
  hasEmptyRecordData,
} = require('../../lib/records/empty-record-pages.cjs');

describe('empty record page helpers', () => {
  it('detects when records filters are present', () => {
    const params = new URLSearchParams('level=M&bestOf=1');
    expect(hasRecordsFilterParams(params)).toBe(true);
  });

  it('ignores pages without records filters', () => {
    const params = new URLSearchParams('foo=bar');
    expect(hasRecordsFilterParams(params)).toBe(false);
  });

  it('resolves page record and subtab from pathname', () => {
    expect(resolvePageRecordAndSub('/records/wins')).toEqual({ record: 'wins', sub: undefined });
    expect(resolvePageRecordAndSub('/records/ages/youngest-winners')).toEqual({ record: 'ages', sub: 'youngestWinners' });
  });

  it('maps ages subpaths to the corresponding API path and type param', () => {
    const req = resolveRecordApiRequest('ages', 'youngestWinners', new URLSearchParams('level=G'));
    expect(req.pathname).toBe('/api/records/ages/winners');
    expect(req.searchParams.get('type')).toBe('youngest');
    expect(req.searchParams.get('level')).toBe('G');
  });

  it('maps round subpaths to plural api endpoints', () => {
    const req = resolveRecordApiRequest('roundsonentries', 'round', new URLSearchParams('surface=Clay'));
    expect(req.pathname).toBe('/api/records/roundsonentries/rounds');
    expect(req.searchParams.get('surface')).toBe('Clay');
  });

  it('uses legacy subtab query to build canonical API path and strips routing params', () => {
    const req = resolveRecordApiRequest('streak', undefined, new URLSearchParams('subtab=wins&level=D&surface=Carpet'));
    expect(req.pathname).toBe('/api/records/streak/wins');
    expect(req.searchParams.get('subtab')).toBeNull();
    expect(req.searchParams.get('level')).toBe('D');
    expect(req.searchParams.get('surface')).toBe('Carpet');
  });

  it('strips invalid filters for counterseasons titles API requests', () => {
    const req = resolveRecordApiRequest(
      'counterseasons',
      'titles',
      new URLSearchParams('bestOf=3&level=M&round=QF&surface=Clay')
    );
    expect(req.pathname).toBe('/api/records/counterseasons/titles');
    expect(req.searchParams.get('level')).toBe('M');
    expect(req.searchParams.get('surface')).toBe('Clay');
    expect(req.searchParams.get('bestOf')).toBeNull();
    expect(req.searchParams.get('round')).toBeNull();
  });

  it('detects missing required params for atage and ageofnth endpoints', () => {
    expect(hasMissingRequiredRecordParams('atage', 'wins', new URLSearchParams('level=F'))).toBe(true);
    expect(hasMissingRequiredRecordParams('atage', 'wins', new URLSearchParams('age=30&level=F'))).toBe(false);
    expect(hasMissingRequiredRecordParams('ageofnth', 'round', new URLSearchParams('n=3'))).toBe(true);
    expect(hasMissingRequiredRecordParams('ageofnth', 'round', new URLSearchParams('n=3&round=F'))).toBe(false);
  });

  it('detects missing round for timespan rounds endpoint', () => {
    expect(hasMissingRequiredRecordParams('timespan', 'rounds', new URLSearchParams('level=M&surface=Clay'))).toBe(true);
    expect(hasMissingRequiredRecordParams('timespan', 'rounds', new URLSearchParams('round=QF&level=M&surface=Clay'))).toBe(false);
  });

  it('validates that API records pathname exists before internal prefetch', () => {
    expect(isExistingRecordApiPath('/api/records/streak/wins')).toBe(true);
    expect(isExistingRecordApiPath('/api/records/streak')).toBe(false);
    expect(isExistingRecordApiPath('/api/records/not-a-real-route')).toBe(false);
  });

  it('detects empty arrays in object payloads', () => {
    expect(hasEmptyRecordData({ topWinners: [] })).toBe(true);
    expect(hasEmptyRecordData({ topWinners: [], totalCount: 0 })).toBe(true);
    expect(hasEmptyRecordData({ topWinners: [{ id: 1 }], totalCount: 1 })).toBe(false);
    expect(hasEmptyRecordData({ foo: 'bar' })).toBe(false);
  });
});