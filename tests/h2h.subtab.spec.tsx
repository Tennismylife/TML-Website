import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HContentClient from '@/app/h2h/H2HContentClient';

describe('H2H — subtab navigation', () => {
  it('renders preview by default and switches to statistics', () => {
    const p1 = { id: 'p1', atpname: 'Player One', ioc: 'USA' };
    const p2 = { id: 'p2', atpname: 'Player Two', ioc: 'ESP' };

    const matches = [
      // one hard match where player1 is winner
      {
        id: 1,
        winner_id: 'p1',
        loser_id: 'p2',
        winner_name: 'Player One',
        loser_name: 'Player Two',
        surface: 'Hard',
        tourney_level: 'G',
        w_ace: 10,
        w_svpt: 100,
        l_ace: 0,
        l_svpt: 80,
      },
      // one clay match where player2 wins
      {
        id: 2,
        winner_id: 'p2',
        loser_id: 'p1',
        winner_name: 'Player Two',
        loser_name: 'Player One',
        surface: 'Clay',
        tourney_level: '',
        w_ace: 5,
        w_svpt: 50,
        l_ace: 2,
        l_svpt: 60,
      },
    ];

    render(
      <H2HContentClient
        matches={matches as any}
        player1={p1 as any}
        player2={p2 as any}
      >
        <div data-testid="preview-child">PREVIEW</div>
      </H2HContentClient>
    );

    // overview should be visible initially
    expect(screen.getByTestId('preview-child')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();

    // switch to statistics
    fireEvent.click(screen.getByText('Statistics'));

    expect(screen.queryByTestId('preview-child')).not.toBeInTheDocument();

    // radar chart includes category labels
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Clay')).toBeInTheDocument();
  });
});