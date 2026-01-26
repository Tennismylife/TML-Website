import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the layout helpers and the client component used by Page
vi.mock('../../app/tournaments/[id]/[year]/layout', () => ({
  fetchEditionInfo: vi.fn(),
  buildTournamentJsonLdFromDb: vi.fn(),
}));
vi.mock('../../app/tournaments/[id]/[year]/EditionClient', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('div', null, `Client:${props?.params?.id || ''}:${props?.params?.year || ''}`),
}));

import Page from '../../app/tournaments/[id]/[year]/page';
import { fetchEditionInfo, buildTournamentJsonLdFromDb } from '../../app/tournaments/[id]/[year]/layout';



const mockedFetch = fetchEditionInfo as unknown as any;
const mockedBuildJson = buildTournamentJsonLdFromDb as unknown as any;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Tournament page – no ghost 404', () => {
  it('renders friendly fallback when fetchEditionInfo throws', async () => {
    mockedFetch.mockImplementation(() => { throw new Error('DB error'); });
    mockedBuildJson.mockResolvedValue('');

    const markup = renderToStaticMarkup(await Page({ params: { id: 'australian-open', year: '1971' } } as any));

    expect(markup).toContain('Tournament edition unavailable');
    expect(markup).not.toContain('404 - Page Not Found');
  });

  it('renders friendly fallback when fetchEditionInfo returns null (unresolvable id)', async () => {
    mockedFetch.mockResolvedValue(null);
    mockedBuildJson.mockResolvedValue('');

    const markup = renderToStaticMarkup(await Page({ params: { id: 'not-found', year: '1971' } } as any));

    expect(markup).toContain('Tournament edition unavailable');
    expect(markup).not.toContain('404 - Page Not Found');
  });

  it('renders normal page when edition exists', async () => {
    mockedFetch.mockResolvedValue({ tourneyRow: { slug: 'australian-open', name: 'Australian Open' }, tourneyIds: ['AO'], hasMatches: true });
    mockedBuildJson.mockResolvedValue('<script type="application/ld+json">{}</script>');

    const markup = renderToStaticMarkup(await Page({ params: { id: 'australian-open', year: '1971' } } as any));

    expect(markup).toContain('Client:australian-open:1971');
    expect(markup).not.toContain('Tournament edition unavailable');
  });
});
