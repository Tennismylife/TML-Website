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

describe('MatchesFilterPanel facets integration', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers facets API for filter options when available', async () => {
    const playerId = 'p_facets_test';

    const facetsPayload = {
      years: [{ value: 2026, count: 12 }, { value: 2025, count: 8 }],
      surfaces: [{ value: 'Clay', count: 10 }, { value: 'Hard', count: 5 }],
      levels: [{ value: 'G', count: 3 }, { value: 'M', count: 7 }],
      rounds: [{ value: 'F', count: 2 }],
      tourneys: [{ id: '1727', name: 'Test Open', count: 5 }, { id: '520', name: 'Big Slam', count: 3 }],
      bestOf: [{ value: 3, count: 12 }, { value: 5, count: 3 }]
    };

    globalFetch.mockImplementation(async (url: RequestInfo | URL, opts?: any) => {
      const s = String(url);
      if (s.includes('/api/players/match-facets')) {
        return { ok: true, json: async () => facetsPayload } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<MatchesFilterPanel playerId={playerId} matches={[]} allMatches={[]} updateUrl={() => {}} />);

    // Wait for facets to be loaded and the UI to reflect tourney options
    await userEvent.click(screen.getByText('Tourney'));

    await waitFor(() => expect(screen.getByLabelText('Test Open')).toBeTruthy());
    const t = screen.getByLabelText('Test Open') as HTMLInputElement;
    expect(t.value).toBe('1727');

    // Ensure surface options reflect facets (Clay present)
    await userEvent.click(screen.getByText('Surface'));
    await waitFor(() => expect(screen.getByLabelText('Clay')).toBeTruthy());
  });
});