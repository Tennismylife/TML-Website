import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));
vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: () => null } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: () => null }));

import RoundFull from '@/app/tournaments/[id]/records/rounds/_components/RoundFull';

describe('RoundFull server component', () => {
  it('renders Most R128 Appearances at the Australian Open heading', async () => {
    // mock fetch used inside RoundFull for API call
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/tournaments/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ roundItems: [{ fullList: [] }] }) } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    const markup = renderToStaticMarkup(await RoundFull({ id: 'australian-open', round: 'R128' } as any));
    expect(markup).toContain('Most Round of 128 Appearances at the Australian Open');

    fetchSpy.mockRestore();
  });
});
