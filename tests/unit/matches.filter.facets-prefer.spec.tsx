import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

import MatchesFilterPanel from '../../app/players/[id]/Matches/MatchesFilterPanel';

describe('MatchesFilterPanel prefers full facets over deriving from preview', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses API facets instead of preview-derived options', async () => {
    const previewMatches = [
      { tourney_id: '1', tourney_name: 'Tiny Tourney' },
      { tourney_id: '2', tourney_name: 'Other Mini' }
    ] as any;

    const apiFacets = {
      years: [{ value: 2026, count: 100 }],
      surfaces: [{ value: 'Clay', count: 80 }],
      levels: [{ value: 'G', count: 10 }],
      rounds: [],
      tourneys: [
        { id: '100', name: 'Roland Garros', count: 50 },
        { id: '101', name: 'Wimbledon', count: 40 }
      ]
    };

    fetchSpy.mockImplementation(async (url: RequestInfo | URL, opts?: any) => {
      const s = String(url);
      if (s.includes('/api/players/match-facets')) {
        return { ok: true, json: async () => apiFacets } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<MatchesFilterPanel playerId={'p1'} matches={[]} allMatches={previewMatches} updateUrl={() => {}} />);

    await userEvent.click(screen.getByText('Tourney'));

    await waitFor(() => {
      expect(screen.queryByLabelText('Tiny Tourney')).toBeNull();
      expect(screen.getByLabelText('Roland Garros')).toBeTruthy();
      expect(screen.getByLabelText('Wimbledon')).toBeTruthy();
    });
  });
});