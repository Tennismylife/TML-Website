/** @vitest-environment node */
import { describe, it, expect } from 'vitest';

const {
  hasRecordsFilterParams,
  resolvePageRecordAndSub,
  resolveRecordApiRequest,
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

  it('detects empty arrays in object payloads', () => {
    expect(hasEmptyRecordData({ topWinners: [] })).toBe(true);
    expect(hasEmptyRecordData({ topWinners: [], totalCount: 0 })).toBe(true);
    expect(hasEmptyRecordData({ topWinners: [{ id: 1 }], totalCount: 1 })).toBe(false);
    expect(hasEmptyRecordData({ foo: 'bar' })).toBe(false);
  });
});