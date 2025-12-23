import { describe, it, expect } from 'vitest';
import { playerMatchesUrl, playerTournamentsUrl } from '../app/records/nav';

describe('records/nav helpers', () => {
  it('includes subtab in playerMatchesUrl when provided', () => {
    const url = playerMatchesUrl('123', { subtab: 'titles', extra: 'x' } as any);
    const u = new URL('http://example.com' + url);
    expect(u.pathname).toBe('/players/123');
    expect(u.searchParams.get('tab')).toBe('matches');
    expect(u.searchParams.get('subtab')).toBe('titles');
    expect(u.searchParams.get('extra')).toBe('x');
  });

  it('includes subtab in playerTournamentsUrl when provided', () => {
    const url = playerTournamentsUrl('456', { subtab: 'rounds', year: 2020 } as any);
    const u = new URL('http://example.com' + url);
    expect(u.pathname).toBe('/players/456');
    expect(u.searchParams.get('tab')).toBe('tournaments');
    expect(u.searchParams.get('subtab')).toBe('rounds');
    expect(u.searchParams.get('year')).toBe('2020');
  });
});