import React from 'react';
import { render, screen } from '@testing-library/react';
import EditionMatchesTable from '../../app/tournaments/[id]/[year]/EditionMatchesTable';
import { vi } from 'vitest';

describe('EditionMatchesTable', () => {
  it('includes an H2H column immediately before score and renders the link', () => {
    const matches = [
      {
        round: 'F',
        winner_id: '1',
        winner_name: 'Alice',
        loser_id: '2',
        loser_name: 'Bob',
        score: '6-4 6-4',
      } as any,
    ];

    render(
      <EditionMatchesTable
        matches={matches}
        sortKey={'round'}
        sortDir={'asc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'0'}
      />
    );

    // check header order
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent);
    const h2hIndex = headers.indexOf('H2H');
    const scoreIndex = headers.indexOf('Score');
    expect(h2hIndex).toBeGreaterThan(-1);
    expect(scoreIndex).toBeGreaterThan(-1);
    // H2H now comes immediately after Score
    expect(h2hIndex).toBe(scoreIndex + 1);

    // check link cell
    const link = screen.getByRole('link', { name: /H2H/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/h2h/alice-vs-bob');
  });
});