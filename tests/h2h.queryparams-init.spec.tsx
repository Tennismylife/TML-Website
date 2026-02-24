import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HContentClient from '@/app/h2h/H2HContentClient';
import H2HClient from '@/app/h2h/H2HClient';

describe('H2H — initialize filters from querystring', () => {
  it('H2HContentClient applies query params on mount (SSR path)', async () => {
    // set URL as if user opened a shared link
    window.history.pushState({}, '', '/h2h/rafael-nadal-vs-roger-federer?year=2015&level=500&best_of=3');

    const p1 = { id: 'p1', atpname: 'Rafael Nadal', ioc: 'ESP' };
    const p2 = { id: 'p2', atpname: 'Roger Federer', ioc: 'SUI' };

    const matches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', winner_name: 'Rafael Nadal', loser_name: 'Roger Federer', year: 2015, tourney_level: '500', tourney_date: '2015-06-01', tourney_name: 'Rome', best_of: 3, status: true, score: '6-4 6-4' },
      { id: 2, winner_id: 'p2', loser_id: 'p1', winner_name: 'Roger Federer', loser_name: 'Rafael Nadal', year: 2016, tourney_level: '1000', tourney_date: '2016-06-01', tourney_name: 'Paris', best_of: 5, status: true, score: '6-4 6-4 6-4' },
    ];

    render(<H2HContentClient matches={matches} player1={p1} player2={p2} />);

    // Best-of and Year filters should reflect the querystring
    const bestOfSelect = screen.getByText('Best of').nextElementSibling as HTMLSelectElement;
    const yearSelect = screen.getByText('Season').nextElementSibling as HTMLSelectElement;

    await waitFor(() => expect(bestOfSelect.value).toBe('3'));
    await waitFor(() => expect(yearSelect.value).toBe('2015'));

    // The table should be filtered so only the 2015 / BO3 match is visible
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Rome');
  });

  it('H2HClient (client-only) honors query params on load', async () => {
    window.history.pushState({}, '', '/h2h/rafael-nadal-vs-roger-federer?year=2015&level=500&best_of=5');

    const p1 = { id: 'p1', atpname: 'Rafael Nadal', slug: 'rafael-nadal' };
    const p2 = { id: 'p2', atpname: 'Roger Federer', slug: 'roger-federer' };

    // include an initial match so the Best of / Level options exist immediately
    const initialMatches = [
      { id: 10, winner_id: 'p2', loser_id: 'p1', winner_name: 'Roger Federer', loser_name: 'Rafael Nadal', year: 2015, tourney_level: '500', tourney_date: '2015-06-01', tourney_name: 'Demo', best_of: 5, status: true, score: '6-4 6-4 6-4' },
    ];

    render(<H2HClient initialPlayer1={p1} initialPlayer2={p2} initialMatches={initialMatches} initialOpponents={[]} />);

    const bestOfSelect = screen.getByText('Best of').nextElementSibling as HTMLSelectElement;
    const levelSelect = screen.getByText('Level').nextElementSibling as HTMLSelectElement;

    await waitFor(() => expect(bestOfSelect.value).toBe('5'));
    await waitFor(() => expect(levelSelect.value).toBe('500'));
  });
});