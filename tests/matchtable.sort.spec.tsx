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
});