import { describe, it, expect } from 'vitest';
import { buildContextualRecordsPath, resolveRecordHref } from '../app/records/record-links';

describe('records pathname resolution', () => {
  it('uses contextual paths when a record has no canonical slug', () => {
    expect(buildContextualRecordsPath('count')).toBe('/records/rounds');
    expect(buildContextualRecordsPath('atage', 'wins')).toBe('/records/atage/wins');
  });

  it('uses canonical slugs when they exist', () => {
    expect(resolveRecordHref(['wins'])).toBe('/records/most-career-wins');
    expect(resolveRecordHref(['wins'], { level: ['F'] })).toBe('/records/most-wins-in-atp-finals');
  });

  it('keeps contextual paths for non-canonical filter combinations', () => {
    expect(resolveRecordHref(['neededto', 'titles'], { surface: ['Grass'] })).toBe('/records/neededto/titles?surface=Grass');
  });
});
