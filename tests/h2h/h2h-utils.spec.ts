import { describe, it, expect } from 'vitest';
import { lastNMatches, playerResultsForMatches, filterCountedMatches } from '@/lib/h2hUtils';

describe('h2hUtils', () => {
  it('returns correct last 5 results when ids present', () => {
    const matches = [
      { tourney_date: '2020-01-01', winner_id: 'A', loser_id: 'B' },
      { tourney_date: '2020-02-01', winner_id: 'B', loser_id: 'A' },
      { tourney_date: '2020-03-01', winner_id: 'A', loser_id: 'B' },
      { tourney_date: '2020-04-01', winner_id: 'A', loser_id: 'B' },
      { tourney_date: '2020-05-01', winner_id: 'B', loser_id: 'A' },
      { tourney_date: '2020-06-01', winner_id: 'A', loser_id: 'B' },
    ];

    const last = lastNMatches(matches, 5);
    expect(last.map(m => m.tourney_date)).toEqual(['2020-02-01','2020-03-01','2020-04-01','2020-05-01','2020-06-01']);

    const aRes = playerResultsForMatches('A', 'A', last);
    const bRes = playerResultsForMatches('B', 'B', last);

    expect(aRes).toEqual(['L','W','W','L','W']);
    expect(bRes).toEqual(['W','L','L','W','L']);
  });

  it('falls back to names when ids missing', () => {
    const matches = [
      { tourney_date: '2021-01-01', winner_name: 'X', loser_name: 'Y' },
      { tourney_date: '2021-02-01', winner_name: 'Y', loser_name: 'X' },
    ];

    const last = lastNMatches(matches, 5);
    expect(playerResultsForMatches(null, 'X', last)).toEqual(['W','L']);
    expect(playerResultsForMatches(null, 'Y', last)).toEqual(['L','W']);
  });

  it('filters out special scores and status false', () => {
    const matches = [
      { tourney_date: '2022-01-01', winner_id: 'A', loser_id: 'B', score: '6-3 6-4' },
      { tourney_date: '2022-02-01', winner_id: 'A', loser_id: 'B', score: 'W/O' },
      { tourney_date: '2022-03-01', winner_id: 'B', loser_id: 'A', status: false },
      { tourney_date: '2022-04-01', winner_id: 'B', loser_id: 'A', score: '6-4 6-4' },
    ];

    const counted = filterCountedMatches(matches);
    expect(counted.map(m => m.tourney_date)).toEqual(['2022-01-01','2022-04-01']);

    const last = lastNMatches(matches, 5);
    expect(playerResultsForMatches('A', 'A', last)).toEqual(['W','L']);
  });
});