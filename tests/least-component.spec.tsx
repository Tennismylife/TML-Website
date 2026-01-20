import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LeastFull from '@/app/tournaments/[id]/records/least/_components/LeastFull';

vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' }) }));

describe('LeastFull component', () => {
  it('renders boxed per-round table with SSR marker and styles', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'W', fullList: [{ id: 'p1', player: { id: 'p1', name: 'Player A', ioc: 'USA' }, minGamesLost: 3, year: 2001 }] }
      ],
      tournament: { name: 'Test Tournament' }
    };

    const fetchSpy = vi.spyOn(global as any, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    const el = await LeastFull({ id: 'australian-open', title: 'W' } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('Least games lost to win title at Test Tournament');
    expect(html).toContain('<h1');
    expect(html).toContain('data-ssr-rows="1"');
    expect(html).toContain('bg-gray-800');
    expect(html).toContain('text-blue-400');
    expect(html).toContain('border-gray-700');

    fetchSpy.mockRestore();
  });

  it('renders index page fallback properly', async () => {
    const fakeResponse = { roundItems: [], tournament: { name: 'Test Tournament' } };
    const fetchSpy = vi.spyOn(global as any, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any));

    const el = await LeastFull({ id: 'australian-open' } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('Least Records at Test Tournament');

    fetchSpy.mockRestore();
  });
});