import React from 'react';
import { render, screen } from '@testing-library/react';
import MatchTable from '../../components/MatchTable';
import { vi } from 'vitest';

describe('MatchTable', () => {
  it('shows Loading... when loading prop is true', () => {
    render(
      <MatchTable
        matches={[]}
        loading={true}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'p'}
      />
    );

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows No matches found. when not loading and no matches', () => {
    render(
      <MatchTable
        matches={[]}
        loading={false}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'p'}
      />
    );

    expect(screen.getByText('No matches found.')).toBeTruthy();
  });

  it('player links include /matches when currentTab=matches', () => {
    const matches = [
      {
        tourney_date: '2025-01-01',
        tourney_name: 'Test Open',
        tourney_id: '2025-1',
        surface: 'Hard',
        round: 'R32',
        winner_id: '1',
        winner_slug: 'carlos-alcaraz',
        winner_name: 'Carlos Alcaraz',
        loser_id: '2',
        loser_slug: 'some-opponent',
        loser_name: 'Opponent',
        score: '6-3 6-4'
      }
    ];

    render(
      <MatchTable
        matches={matches}
        loading={false}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'999'}
        currentTab={'matches'}
      />
    );

    const winnerLink = screen.getByRole('link', { name: /Carlos Alcaraz/i });
    expect(winnerLink).toBeInTheDocument();
    expect(winnerLink.getAttribute('href') || '').toContain('/players/carlos-alcaraz/matches');

    const loserLink = screen.getByRole('link', { name: /Opponent/i });
    expect(loserLink.getAttribute('href') || '').toContain('/players/some-opponent/matches');
  });
});