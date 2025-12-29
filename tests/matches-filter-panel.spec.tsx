import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/** @vitest-environment jsdom */

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

import MatchesFilterPanel from '../app/players/[id]/Matches/MatchesFilterPanel';
import { Match } from '../types';

describe('MatchesFilterPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not include tournaments with tourney_level = D in the Tourney filter', async () => {
    const allMatches: Match[] = [
      {
        id: '1',
        year: 2021,
        tourney_id: '100',
        tourney_name: 'Davis Cup 2021',
        tourney_level: 'D',
        status: true,
        winner_id: 'p1',
        loser_id: 'p2',
        tourney_date: '2021-01-01'
      } as any,
      {
        id: '2',
        year: 2021,
        tourney_id: '200',
        tourney_name: 'Open 200',
        tourney_level: 'A',
        status: true,
        winner_id: 'p1',
        loser_id: 'p3',
        tourney_date: '2021-02-01'
      } as any,
    ];

    render(<MatchesFilterPanel playerId={'p1'} matches={allMatches} allMatches={allMatches} updateUrl={() => {}} />);

    // Open the Tourney category to reveal tourney radio options
    await userEvent.click(screen.getByText('Tourney'));

    // Wait until the tourney radio for Open 200 is present
    await waitFor(() => expect(screen.getByLabelText('Open 200')).toBeTruthy());

    // The Davis Cup entry should NOT be present
    const davis = screen.queryByLabelText('Davis Cup 2021');
    expect(davis).toBeNull();

    // The tourney id value 200 should exist as a radio
    const t200 = screen.getByLabelText('Open 200') as HTMLInputElement;
    expect(t200?.value).toBe('200');
  });
});