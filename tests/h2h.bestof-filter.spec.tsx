import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HClient from '@/app/h2h/H2HClient';

describe('H2H best_of filter (client)', () => {
  it('filters the matches table when Best of is changed', () => {
    const p1 = { id: 'p1', atpname: 'Player One', slug: 'player-one' };
    const p2 = { id: 'p2', atpname: 'Player Two', slug: 'player-two' };

    const initialMatches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', winner_name: 'Player One', loser_name: 'Player Two', tourney_date: '2020-01-01', tourney_name: 'T1', best_of: 3, status: true, score: '6-4 6-4' },
      { id: 2, winner_id: 'p2', loser_id: 'p1', winner_name: 'Player Two', loser_name: 'Player One', tourney_date: '2021-01-01', tourney_name: 'T2', best_of: 5, status: true, score: '6-4 6-4 6-4' },
      { id: 3, winner_id: 'p1', loser_id: 'p2', winner_name: 'Player One', loser_name: 'Player Two', tourney_date: '2022-01-01', tourney_name: 'T3', best_of: 3, status: true, score: '6-4 6-4' },
    ];

    const { container } = render(
      <H2HClient initialPlayer1={p1} initialPlayer2={p2} initialMatches={initialMatches} initialOpponents={[]} />
    );

    // Initially all three matches should be visible
    const rowsBefore = container.querySelectorAll('tbody tr');
    expect(rowsBefore.length).toBe(3);

    // Select Best of 3 (label isn't linked to the control in markup; find select adjacent to label)
    const label = screen.getByText('Best of');
    const select = label.nextElementSibling as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '3' } });

    // Now only the two BO3 matches should remain
    const rowsAfter = container.querySelectorAll('tbody tr');
    expect(rowsAfter.length).toBe(2);

    // Verify the BoF column contains '3' for rendered rows
    for (const row of Array.from(rowsAfter)) {
      expect(row.textContent).toContain('3');
    }
  });
});