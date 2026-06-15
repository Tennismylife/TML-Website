import { describe, it, expect } from 'vitest';
import { generateRecordLink } from '../lib/recordsLinks';
import { resolveRecordHref } from '../app/records/record-links';
import { getWhitelistEntryByCanonicalPath } from '../lib/seo/records-policy';

describe('generateRecordLink', () => {
  it('resolves canonical path with subtab and filters', () => {
    const href = generateRecordLink('ages', 'oldest', { surface: 'Grass' });
    expect(href).toBe('/records/oldest-players-in-main-draw-on-grass-court');
  });

  it('builds record-only path without subtab', () => {
    const href = generateRecordLink('wins');
    expect(href).toBe('/records/most-career-wins');
  });
});

describe('resolveRecordHref', () => {
  it('keeps count contextual when unfiltered', () => {
    expect(resolveRecordHref(['count'])).toBe('/records/rounds');
  });

  it('maps count finals to the canonical record page', () => {
    expect(resolveRecordHref(['count'], { round: 'F' })).toBe('/records/most-finals-reached');
  });

  it('maps wins + ATP Finals to the ATP Finals canonical page', () => {
    expect(resolveRecordHref(['wins'], { level: ['F'] })).toBe('/records/most-wins-in-atp-finals');
  });

  it('falls back to the base record path when an alias page adds a non-canonical filter combination', () => {
    expect(
      resolveRecordHref(['played'], { level: ['G'], round: 'R128' }, { currentPath: '/records/most-grand-slam-matches-played' }),
    ).toBe('/records/played?level=G&round=R128');
  });

  it('maps timespan + hard surface to the canonical hard-court page from the current context', () => {
    expect(
      resolveRecordHref(['timespan', 'entries'], { surface: ['Hard'] }, { currentPath: '/records/longest-appearance-timespan' }),
    ).toBe('/records/longest-hard-court-appearance-timespan');
  });

  it('maps timespan titles to the 2-form canonical path', () => {
    expect(resolveRecordHref(['timespan', 'titles'])).toBe('/records/longest-timespan-between-2-atp-titles');
  });

  it('maps seasons round finals to the canonical single-season finals page', () => {
    expect(resolveRecordHref(['seasons', 'round'], { round: 'F' })).toBe('/records/most-finals-in-a-single-season');
  });

  it('maps ATP 250 entries to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['entries'], { level: ['250'] })).toBe('/records/most-atp-250-appearances');
    expect(getWhitelistEntryByCanonicalPath('/records/most-atp-250-appearances')).toBeUndefined();
  });

  it('maps ATP Finals entries to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['entries'], { level: ['F'] })).toBe('/records/most-atp-finals-appearances');
    expect(getWhitelistEntryByCanonicalPath('/records/most-atp-finals-appearances')).toBeUndefined();
  });

  it('maps ATP 500 entries to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['entries'], { level: ['500'] })).toBe('/records/most-atp-500-appearances');
    expect(getWhitelistEntryByCanonicalPath('/records/most-atp-500-appearances')).toBeUndefined();
  });

  it('maps roundsonentries titles on hard court to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['roundsonentries', 'titles'], { surface: ['Hard'] })).toBe('/records/most-appearances-at-single-hard-court-tournament');
    expect(getWhitelistEntryByCanonicalPath('/records/most-appearances-at-single-hard-court-tournament')).toBeUndefined();
  });

  it('maps roundsonentries titles on clay court to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['roundsonentries', 'titles'], { surface: ['Clay'] })).toBe('/records/most-appearances-at-single-clay-court-tournament');
    expect(getWhitelistEntryByCanonicalPath('/records/most-appearances-at-single-clay-court-tournament')).toBeUndefined();
  });

  it('maps roundsonentries titles on grass court to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['roundsonentries', 'titles'], { surface: ['Grass'] })).toBe('/records/most-appearances-at-single-grass-court-tournament');
    expect(getWhitelistEntryByCanonicalPath('/records/most-appearances-at-single-grass-court-tournament')).toBeUndefined();
  });

  it('maps roundsonentries titles on carpet court to the direct canonical page without whitelisting it', () => {
    expect(resolveRecordHref(['roundsonentries', 'titles'], { surface: ['Carpet'] })).toBe('/records/most-appearances-at-single-carpet-court-tournament');
    expect(getWhitelistEntryByCanonicalPath('/records/most-appearances-at-single-carpet-court-tournament')).toBeUndefined();
  });
});
