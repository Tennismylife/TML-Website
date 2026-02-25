import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

import MatchTable from '../components/MatchTable';
import { Match } from '../types';

describe('MatchTable sorting by date respects round order within same tournament', () => {
  const matches: Match[] = [
    {
      id: '1',
      year: 2026,
      tourney_id: 'T1',
      tourney_name: 'Test Open',
      tourney_date: '2026-01-10', // R64 placed later
      round: 'R64',
      winner_id: 'p1',
      loser_id: 'p2'
    } as any,
    {
      id: '2',
      year: 2026,
      tourney_id: 'T1',
      tourney_name: 'Test Open',
      tourney_date: '2026-01-05', // SF placed earlier
      round: 'SF',
      winner_id: 'p3',
      loser_id: 'p4'
    } as any,
    {
      id: '3',
      year: 2026,
      tourney_id: 'T1',
      tourney_name: 'Test Open',
      tourney_date: '2026-01-15',
      round: 'F',
      winner_id: 'p5',
      loser_id: 'p6'
    } as any,
  ];

  it('keeps rounds in R256..F order even when dates would reorder them', () => {
    // sortKey tourney_date, asc
    render(
      <MatchTable
        matches={matches}
        sortKey={'tourney_date'}
        sortDir={'asc'}
        setSortKey={() => {}}
        setSortDir={() => {}}
        playerId={''}
      />
    );

    // Get rounds from rendered rows (4th column)
    const tbody = screen.getByRole('table').querySelector('tbody')!;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const rounds = rows.map(r => r.querySelector('td:nth-child(4)')?.textContent?.trim());

    // Expect order R64, SF, F (R64 before SF despite date indicating SF earlier)
    expect(rounds).toEqual(['R64', 'SF', 'F']);
  });

  it('keeps round order when sorting by date desc within same tournament (reversed)', () => {
    render(
      <MatchTable
        matches={matches}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={() => {}}
        setSortDir={() => {}}
        playerId={''}
      />
    );

    const tbody = screen.getByRole('table').querySelector('tbody')!;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const rounds = rows.map(r => r.querySelector('td:nth-child(4)')?.textContent?.trim());

    // When sorting by date desc, rounds should be reversed so matches are consecutive by round
    expect(rounds).toEqual(['F', 'SF', 'R64']);
  });

  describe('F-level tournament special ordering', () => {
    const fMatches: Match[] = [
      { id: 'a', year: 2026, tourney_id: 'F1', tourney_name: 'Finals', tourney_date: '2026-11-15', round: 'F', tourney_level: 'F', winner_id: 'x', loser_id: 'y' } as any,
      { id: 'b', year: 2026, tourney_id: 'F1', tourney_name: 'Finals', tourney_date: '2026-11-10', round: 'RR', tourney_level: 'F', winner_id: 'u', loser_id: 'v' } as any,
      { id: 'c', year: 2026, tourney_id: 'F1', tourney_name: 'Finals', tourney_date: '2026-11-12', round: 'SF', tourney_level: 'F', winner_id: 'm', loser_id: 'n' } as any,
      // include a stray quarter final which should be pushed to the bottom
      { id: 'd', year: 2026, tourney_id: 'F1', tourney_name: 'Finals', tourney_date: '2026-11-08', round: 'QF', tourney_level: 'F', winner_id: 'p', loser_id: 'q' } as any,
    ];

    it('sorts rounds RR, SF, F when tourney_level is F even if dates conflict', () => {
      render(
        <MatchTable
          matches={fMatches}
          sortKey={'round'}
          sortDir={'asc'}
          setSortKey={() => {}}
          setSortDir={() => {}}
          playerId={''}
        />
      );
      const tbody = screen.getByRole('table').querySelector('tbody')!;
      const rounds = Array.from(tbody.querySelectorAll('tr')).map(r => r.querySelector('td:nth-child(4)')?.textContent?.trim());
      // QF should be last
      expect(rounds).toEqual(['RR','SF','F','QF']);
    });
  });
});