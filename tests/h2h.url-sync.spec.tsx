import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HClient from '@/app/h2h/H2HClient';
import H2HContentClient from '@/app/h2h/H2HContentClient';
import { useRouter } from 'next/navigation';

describe('H2H filter -> URL sync', () => {
  it('updates querystring when filters change in H2HClient', () => {
    const p1 = { id: 'p1', atpname: 'Player One', slug: 'player-one' };
    const p2 = { id: 'p2', atpname: 'Player Two', slug: 'player-two' };

    const initialMatches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', winner_name: 'Player One', loser_name: 'Player Two', tourney_date: '2020-01-01', tourney_name: 'T1', best_of: 3, status: true, score: '6-4 6-4' },
    ];
    render(<H2HClient initialPlayer1={p1} initialPlayer2={p2} initialMatches={initialMatches} initialOpponents={[]} />);

    const label = screen.getByText('Best of');
    const select = label.nextElementSibling as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '3' } });

    // sanity-check the select value updated in the DOM
    expect(select.value).toBe('3');

    // verify browser URL updated
    expect(window.location.search).toEqual(expect.stringContaining('best_of=3'));
  });

  it('updates querystring when filters change in H2HContentClient', () => {
    const p1 = { id: 'p1', atpname: 'Player One', ioc: 'USA' };
    const p2 = { id: 'p2', atpname: 'Player Two', ioc: 'FRA' };
    const matches = [
      { id: 2, winner_id: 'p2', loser_id: 'p1', winner_name: 'Player Two', loser_name: 'Player One', tourney_date: '2021-01-01', tourney_name: 'T2', best_of: 5, status: true, score: '6-4 6-4 6-4' },
    ];

    render(<H2HContentClient player1={p1} player2={p2} matches={matches} />);

    const label = screen.getByText('Best of');
    const select = label.nextElementSibling as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '5' } });

    // sanity-check the select value updated in the DOM
    expect(select.value).toBe('5');

    // verify browser URL updated
    expect(window.location.search).toEqual(expect.stringContaining('best_of=5'));
  });
});