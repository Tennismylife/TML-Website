import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HContentClient from '@/app/h2h/H2HContentClient';

describe('H2HContentClient best_of filter', () => {
  it('filters the server-provided matches when Best of is changed', () => {
    const p1 = { id: 'p1', atpname: 'Player One', ioc: 'USA' };
    const p2 = { id: 'p2', atpname: 'Player Two', ioc: 'FRA' };

    const initialMatches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', winner_name: 'Player One', loser_name: 'Player Two', tourney_date: '2020-01-01', tourney_name: 'T1', best_of: 3, status: true, score: '6-4 6-4' },
      { id: 2, winner_id: 'p2', loser_id: 'p1', winner_name: 'Player Two', loser_name: 'Player One', tourney_date: '2021-01-01', tourney_name: 'T2', best_of: 5, status: true, score: '6-4 6-4 6-4' },
      { id: 3, winner_id: 'p1', loser_id: 'p2', winner_name: 'Player One', loser_name: 'Player Two', tourney_date: '2022-01-01', tourney_name: 'T3', best_of: 3, status: true, score: '6-4 6-4' },
    ];

    const { container } = render(
      <H2HContentClient matches={initialMatches} player1={p1} player2={p2} />
    );

    // All matches visible initially
    expect(container.querySelectorAll('tbody tr').length).toBe(3);

    // Change Best of -> 3
    const label = screen.getByText('Best of');
    const select = label.nextElementSibling as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '3' } });

    // Only BO3 matches should remain
    const rowsAfter = container.querySelectorAll('tbody tr');
    expect(rowsAfter.length).toBe(2);
    for (const row of Array.from(rowsAfter)) {
      expect(row.textContent).toContain('3');
    }
  });
});