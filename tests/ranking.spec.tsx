/** @vitest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Prepare spies that the mock can close over
const replaceSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceSpy, push: vi.fn() }),
  usePathname: () => '/ranking',
}));

vi.mock('@/lib/utils', () => ({ getFlagFromIOC: () => '' }));

// Stub RankingTable to prevent alias resolution issues during transform
vi.mock('../app/ranking/RankingTable', () => ({ default: () => (<div>RankingTableStub</div>) }));

import RankingPage from '../app/ranking/page';

describe('Ranking page - no update loop', () => {
  let fetchSpy: any;

  beforeEach(() => {
    replaceSpy.mockClear();

    fetchSpy = vi.fn(async (url: string) => {
      if (url.includes('/api/ranking/dates')) {
        return {
          ok: true,
          json: async () => ({ dates: ['2025-12-21'] }),
        } as any;
      }
      if (url.includes('/api/ranking?date=')) {
        return {
          ok: true,
          json: async () => ({ rankings: [{ id: 'p1', name: 'Player 1', points: 1000, rank: 1 }] }),
        } as any;
      }
      return { ok: false } as any;
    });

    // Replace global.fetch
    global.fetch = fetchSpy as any;

    // Set initial URL search params to match the available date
    Object.defineProperty(window, 'location', {
      value: { search: '?year=2025&date=2025-12-21' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes from URL without causing duplicate fetches or replace calls', async () => {
    render(<RankingPage />);

    // Wait for dates fetch
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/ranking/dates'));

    // Wait for ranking fetch for the date
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/ranking?date=2025-12-21')));

    // Ensure ranking fetch only called once
    const rankingCalls = fetchSpy.mock.calls.filter((c: any[]) => String(c[0]).includes('/api/ranking?date=')).length;
    expect(rankingCalls).toBe(1);

    // Ensure router.replace not called multiple times (at most 1)
    expect(replaceSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });
});