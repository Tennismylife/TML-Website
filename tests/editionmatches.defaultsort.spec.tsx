import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EditionMatches from '../components/EditionMatches';
import { Match } from '../types';

describe('EditionMatches default sorting', () => {
  it('shows latest match first by default (date desc)', () => {
    const matches: Match[] = [
      { id: '1', tourney_date: '2026-01-05', round: 'SF', tourney_id: 'T', tourney_name: 'Test', year: 2026, winner_id: 'p1', loser_id: 'p2' } as any,
      { id: '2', tourney_date: '2026-01-15', round: 'F', tourney_id: 'T', tourney_name: 'Test', year: 2026, winner_id: 'p3', loser_id: 'p4' } as any,
      { id: '3', tourney_date: '2026-01-10', round: 'R64', tourney_id: 'T', tourney_name: 'Test', year: 2026, winner_id: 'p5', loser_id: 'p6' } as any,
    ];

    render(<EditionMatches matches={matches} />);

    // First row should correspond to the latest date (2026-01-15)
    const rows = screen.getAllByRole('row');
    // header row + data rows -> rows[1] is first data row
    const firstDataRowCells = rows[1].querySelectorAll('td');
    const firstDate = firstDataRowCells[0].textContent?.trim();
    expect(firstDate).toBe(new Date('2026-01-15').toLocaleDateString());
  });
});