import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

import AllMatches from '../../../app/players/[id]/Matches/AllMatches';
import { Match } from '../../../types';

function makeMatch(i: number): Match {
  return {
    id: String(i),
    year: 2026,
    tourney_id: String(100 + i),
    tourney_name: `Tourney ${i}`,
    tourney_level: 'A',
    status: true,
    winner_id: i % 2 === 0 ? 'p1' : 'p2',
    loser_id: i % 2 === 0 ? 'p2' : 'p1',
    tourney_date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    winner_name: `Winner ${i}`,
    loser_name: `Loser ${i}`,
    score: '6-3 6-4'
  } as any;
}

describe('AllMatches preview and Show All behavior', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a preview (limit=10) on initial client load and fetches full list after Show All', async () => {
    const playerId = 'p_test_preview';

    // 1) initial preview response (limit=10)
    const previewMatches = Array.from({ length: 10 }, (_, i) => makeMatch(i + 1));
    // 2) full list to be returned on Show All
    const fullMatches = Array.from({ length: 25 }, (_, i) => makeMatch(i + 1));

    // Setup fetch mock to respond differently depending on URL
    globalFetch.mockImplementation(async (url: RequestInfo | URL, opts?: any) => {
      const s = String(url);
      if (s.includes('allmatches') && s.includes('limit=10')) {
        return {
          ok: true,
          json: async () => previewMatches,
        } as any;
      }
      if (s.includes('allmatches')) {
        return {
          ok: true,
          json: async () => fullMatches,
        } as any;
      }
      // Fallback for other player endpoints
      return { ok: true, json: async () => ({ id: playerId, atpname: 'Test Player', player: 'Test Player' }) } as any;
    });

    render(<AllMatches playerId={playerId} initialMatches={undefined} initialHeading={'Matches'} initialTotals={{ totalWins: 0, totalLosses: 0 }} />);

    // Wait until the preview rows are rendered (MatchTable renders tbody tr per match)
    await waitFor(async () => {
      const rows = await screen.findAllByRole('row');
      // Table header produces one extra row; ensure at least 11 rows (1 header + 10 data rows)
      expect(rows.length).toBeGreaterThanOrEqual(11);
    });

    // Click the Show All button
    const btn = screen.getByRole('button', { name: /Show All matches/i });
    await userEvent.click(btn);

    // Wait for the full rows to be rendered
    await waitFor(async () => {
      const rows = await screen.findAllByRole('row');
      // 1 header + 25 data rows
      expect(rows.length).toBeGreaterThanOrEqual(26);
    });

    // Ensure fetch was called at least once with limit=10 and then again without limit
    const calledUrls = globalFetch.mock.calls.map(c => String(c[0]));
    const hasPreviewCall = calledUrls.some(u => u.includes('allmatches') && u.includes('limit=10'));
    const hasFullCall = calledUrls.some(u => u.includes('allmatches') && !u.includes('limit=10'));
    expect(hasPreviewCall).toBeTruthy();
    expect(hasFullCall).toBeTruthy();
  });
});
