import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' })
}));

describe('TimespanFull component', () => {
  it('renders H3 with Biggest timespan phrasing when round title provided', async () => {
    // mock fetch to return data for round F
    const fakeResponse = {
      allRoundItems: [
        { title: 'F', fullList: [{ id: 'p1', name: 'Player A', ioc: 'USA', firstDate: '2000-01-01', lastDate: '2010-01-01', days: 3652 }] }
      ]
    };
    const fetchSpy = vi.spyOn(global as any, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    const el = await TimespanFull({ id: 'australian-open', title: 'F', section: 'rounds' } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('Biggest timespan between 2 Fs at Australian Open');

    fetchSpy.mockRestore();
  });
});
