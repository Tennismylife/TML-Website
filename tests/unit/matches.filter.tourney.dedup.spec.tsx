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

describe('MatchesFilterPanel tourney deduplication', () => {
  afterEach(() => vi.restoreAllMocks());

  it('deduplicates tourney options provided via serverFacets', async () => {
    const serverFacets = {
      years: [],
      surfaces: [],
      levels: [],
      rounds: [],
      tourneys: [
        { id: '100', name: 'Open A', count: 3 },
        { id: '100', name: 'Open A (Indoor)', count: 1 },
        { id: '101', name: 'Open B', count: 2 }
      ]
    };

    render(<MatchesFilterPanel playerId={'p1'} matches={[]} allMatches={[]} updateUrl={() => {}} serverFacets={serverFacets} />);

    await userEvent.click(screen.getByText('Tourney'));

    await waitFor(() => {
      // unique tourney_name list
      const labels = screen.queryAllByLabelText('Open A');
      expect(labels.length).toBe(1);
      const labelsB = screen.queryAllByLabelText('Open B');
      expect(labelsB.length).toBe(1);
    });
  });

  it('deduplicates tourney options derived from allMatches', async () => {
    const allMatches = [
      { tourney_id: '200', tourney_name: 'Cup X' },
      { tourney_id: '200', tourney_name: 'Cup X' },
      { tourney_id: '201', tourney_name: 'Cup Y' },
    ] as any;

    render(<MatchesFilterPanel playerId={'p1'} matches={[]} allMatches={allMatches} updateUrl={() => {}} />);

    await userEvent.click(screen.getByText('Tourney'));

    await waitFor(() => {
      const labelsX = screen.queryAllByLabelText('Cup X');
      expect(labelsX.length).toBe(1);
      const labelsY = screen.queryAllByLabelText('Cup Y');
      expect(labelsY.length).toBe(1);
    });
  });

  it('keeps tourney_name unique even with multiple names per id', async () => {
    const allMatches = [
      { tourney_id: '300', tourney_name: 'City Open' },
      { tourney_id: '300', tourney_name: 'City Open (Indoor)' },
      { tourney_id: '301', tourney_name: 'Regional Cup' }
    ] as any;

    render(<MatchesFilterPanel playerId={'p1'} matches={[]} allMatches={allMatches} updateUrl={() => {}} />);

    await userEvent.click(screen.getByText('Tourney'));

    await waitFor(() => {
      // unique tourney_name list
      const city = screen.queryAllByLabelText('City Open');
      expect(city.length).toBe(1);
      const rc = screen.queryAllByLabelText('Regional Cup');
      expect(rc.length).toBe(1);
    });
  });
});