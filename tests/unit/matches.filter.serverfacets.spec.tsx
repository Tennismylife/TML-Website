import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

import MatchesFilterPanel from '../../app/players/[id]/Matches/MatchesFilterPanel';

describe('MatchesFilterPanel server facets usage', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses serverFacets prop and does not call fetch', async () => {
    const serverFacets = {
      years: [{ value: 2026, count: 12 }],
      surfaces: [{ value: 'Clay', count: 10 }],
      levels: [{ value: 'G', count: 3 }],
      rounds: [{ value: 'F', count: 2 }],
      tourneys: [{ id: '1727', name: 'Test Open', count: 5 }],
    };

    render(<MatchesFilterPanel playerId={'p1'} matches={[]} allMatches={[]} updateUrl={() => {}} serverFacets={serverFacets} />);

    // Ensure fetch was not called (no client-side facets fetch)
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled());

    // Open Tourney and Surface panels and assert options exist
    await userEvent.click(screen.getByText('Tourney'));
    await waitFor(() => expect(screen.getByLabelText('Test Open')).toBeTruthy());

    await userEvent.click(screen.getByText('Surface'));
    await waitFor(() => expect(screen.getByLabelText('Clay')).toBeTruthy());
  });
});