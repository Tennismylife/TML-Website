import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RoundOnEntriesFull from '@/app/tournaments/[id]/records/roundsonentries/_components/RoundOnEntriesFull';

vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

describe('RoundOnEntriesFull component', () => {
  it('renders H1 with Most <round>s phrasing when round title provided', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'F', fullList: [{ id: 'p1', name: 'Player A', ioc: 'USA', reaches: 3, totalEntries: 10, percentage: 30 }] }
      ],
      tournament: { name: 'Australian Open' }
    };

    const fetchSpy = vi.spyOn(global as any, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    const el = await RoundOnEntriesFull({ params: { id: 'australian-open', title: 'F' } as any } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('Most Finals on Entries at Australian Open');
    expect(html).toContain('<h1');
    expect(html).toContain('data-ssr-rows="1"');
    expect(html).toContain('bg-gray-800');
    expect(html).toContain('text-blue-400');
    expect(html).toContain('border-gray-700');

    fetchSpy.mockRestore();

    // Winner case uses Titles phrasing
    const fakeWinner = { allRoundItems: [ { title: 'Winner', fullList: fakeResponse.allRoundItems[0].fullList } ], tournament: { name: 'Australian Open' } };
    const fetchSpy3 = vi.spyOn(global as any, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeWinner) } as any);
    });

    const el3 = await RoundOnEntriesFull({ params: { id: 'australian-open', title: 'Winner' } as any } as any);
    const html3 = renderToStaticMarkup(el3 as any);
    expect(html3).toContain('Most Titles on Entries at Australian Open');
    expect(html3).toContain('data-ssr-rows="1"');

    fetchSpy3.mockRestore();

    // when API does not include tournament name, fallback should be humanized from id
    const fakeNoTourney = { allRoundItems: [ { title: 'F', fullList: fakeResponse.allRoundItems[0].fullList } ] };
    const fetchSpy2 = vi.spyOn(global as any, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeNoTourney) } as any);
    });

    const el2 = await RoundOnEntriesFull({ params: { id: 'australian-open', title: 'F' } as any } as any);
    const html2 = renderToStaticMarkup(el2 as any);
    expect(html2).toContain('Most Finals on Entries at Australian Open');
    expect(html2).toContain('data-ssr-rows="1"');

    fetchSpy2.mockRestore();
  });

  it('renders H1 for index page when no title provided', async () => {
    const fakeResponse = { allRoundItems: [], tournament: { name: 'Australian Open' } };
    const fetchSpy = vi.spyOn(global as any, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any));

    const el = await RoundOnEntriesFull({ params: { id: 'australian-open' } as any } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('Round on Entries at Australian Open');

    fetchSpy.mockRestore();
  });
});
