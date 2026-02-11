import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the metadata helper to return the canonical tournament name on the server
vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import RecordsTabPage from '@/app/tournaments/[id]/records/[tab]/page';
import RecordsPageClient from '@/app/tournaments/[id]/records/RecordsClient';

function mountClientInMain(clientEl: any, container: HTMLElement) {
  const m = document.createElement('div');
  container.appendChild(m);
  render(clientEl as any, { container: m });
}

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: () => {}, replace: () => {} })
}));
vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' })
}));

// Mock the metadata helper to return the canonical tournament name on the server
vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

// avoid rendering heavier header/tabs components in unit tests; mock them to simple placeholders
vi.mock('@/app/tournaments/[id]/TournamentHeader', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 't-header' }) }));
vi.mock('@/app/tournaments/[id]/records/TournamentTabs', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 't-tabs' }) }));

// mock the heavy section components so tests don't import runtime-only modules
vi.mock('@/app/tournaments/[id]/records/CountSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'count-section' }) }));
vi.mock('@/app/tournaments/[id]/records/RoundsSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'rounds-section' }) }));
vi.mock('@/app/tournaments/[id]/records/AgesSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'ages-section' }) }));
vi.mock('@/app/tournaments/[id]/records/PercentageSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'percentage-section' }) }));
vi.mock('@/app/tournaments/[id]/records/TimespanSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'timespan-section' }) }));
vi.mock('@/app/tournaments/[id]/records/RoundsOnEntries', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'rounds-on-entries-section' }) }));
vi.mock('@/app/tournaments/[id]/records/LeastSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'least-section' }) }));
vi.mock('@/app/tournaments/[id]/records/AverageAgeSection', () => ({ default: (props: any) => React.createElement('div', { 'data-testid': 'avg-age-section' }) }));


describe('RecordsPage H1', () => {
  afterEach(() => {
    pathname = '/';
    vi.restoreAllMocks();
  });

  it('renders the least root heading matching metadata (no suffix)', async () => {
    pathname = '/tournaments/australian-open/records/least';
    // Render server component (H1)
    const serverEl = await RecordsTabPage({ params: { id: 'australian-open', tab: 'least' } as any });
    const { container } = render(serverEl as any);

    // Mount client component into the main area so the header and H3 coexist
    const clientEl = <RecordsPageClient params={{ id: 'australian-open' } as any} />;
    mountClientInMain(clientEl as any, container.querySelector('main') as HTMLElement);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Least Games Lost to Reach a Round');

    const h3 = await screen.findByRole('heading', { level: 3 });
    expect(h3).toHaveTextContent('A curated collection of least games lost to reach a round at Australian Open. Explore match-level data, historical trends, and the players who left their mark on this tournament.');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('renders the rounds root heading matching metadata (no suffix)', async () => {
    pathname = '/tournaments/australian-open/records/rounds';
    // Render server component (H1)
    const serverEl = await RecordsTabPage({ params: { id: 'australian-open', tab: 'rounds' } as any });
    const { container } = render(serverEl as any);
    // debug output
    // eslint-disable-next-line no-console
    console.log('Rounds server HTML:', container.querySelector('main')?.innerHTML);

    // Mount client component into the main area
    const clientEl = <RecordsPageClient params={{ id: 'australian-open' } as any} />;
    mountClientInMain(clientEl as any, container.querySelector('main') as HTMLElement);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Records by Round');

    const desc = await screen.findByText('A curated collection of records by round at Australian Open. Explore match-level data, historical trends, and the players who left their mark on this tournament.');
    expect(desc).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();

  });

  it('renders the count root heading and the specific count description', async () => {
    pathname = '/tournaments/australian-open/records/count';
    // Render server component (H1)
    const serverEl = await RecordsTabPage({ params: { id: 'australian-open', tab: 'count' } as any });
    const { container } = render(serverEl as any);

    // Mount client component into the main area
    const clientEl = <RecordsPageClient params={{ id: 'australian-open' } as any} />;
    mountClientInMain(clientEl as any, container.querySelector('main') as HTMLElement);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Open Era Records');

    const desc = await screen.findByText('A curated collection of records at Australian Open. Titles, Wins Matches Played and Appearances. Explore match-level data, historical trends, and the players who left their mark on this tournament.');
    expect(desc).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('renders the ages root heading matching metadata (no suffix)', async () => {
    pathname = '/tournaments/australian-open/records/ages';
    // Render server component (H1)
    const serverEl = await RecordsTabPage({ params: { id: 'australian-open', tab: 'ages' } as any });
    const { container } = render(serverEl as any);

    // Mount client component into the main area
    const clientEl = <RecordsPageClient params={{ id: 'australian-open' } as any} />;
    mountClientInMain(clientEl as any, container.querySelector('main') as HTMLElement);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Ages');

    const desc = await screen.findByText('A curated collection of ages at Australian Open. Explore match-level data, historical trends, and the players who left their mark on this tournament.');
    expect(desc).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('renders the ages titles page server H1', async () => {
    pathname = '/tournaments/australian-open/records/ages/titles';
    const TitlesPage = (await import('@/app/tournaments/[id]/records/ages/titles/page')).default;
    const serverEl = await TitlesPage({ params: { id: 'australian-open' } as any });
    const { container } = render(serverEl as any);
    // debug output
    // eslint-disable-next-line no-console
    console.log('Titles server HTML:', container.querySelector('main')?.innerHTML);

    // TitlesClient is a client component; mount it into main if needed
    const TitlesClient = (await import('@/app/tournaments/[id]/records/ages/titles/TitlesClient')).default;
    // Mount client without replacing the server H1
    mountClientInMain(<TitlesClient id={'australian-open'} /> as any, container.querySelector('main') as HTMLElement);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Title Age Records');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('renders ages main H1', async () => {
    pathname = '/tournaments/australian-open/records/ages/main';
    const AgesMain = (await import('@/app/tournaments/[id]/records/ages/main/page')).default;
    const serverEl = await AgesMain({ params: { id: 'australian-open' } as any });
    const { container } = render(serverEl as any);

    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Australian Open | Ages');
  });

  it('renders ages youngest/oldest round overviews H1s', async () => {
    pathname = '/tournaments/australian-open/records/ages/youngestrounds';
    const YoungestPage = (await import('@/app/tournaments/[id]/records/ages/youngestrounds/page')).default;
    const serverEl1 = await YoungestPage({ params: { id: 'australian-open' } as any });
    const { container: c1 } = render(serverEl1 as any);
    expect(c1.querySelector('h1')).toHaveTextContent('Youngest per Round at Australian Open');

    pathname = '/tournaments/australian-open/records/ages/oldestrounds';
    const OldestPage = (await import('@/app/tournaments/[id]/records/ages/oldestrounds/page')).default;
    const serverEl2 = await OldestPage({ params: { id: 'australian-open' } as any });
    const { container: c2 } = render(serverEl2 as any);
    expect(c2.querySelector('h1')).toHaveTextContent('Oldest per Round at Australian Open');
  });

  it('renders percentage overview H1s via catch-all', async () => {
    pathname = '/tournaments/australian-open/records/percentage/overall';
    const CatchAll = (await import('@/app/tournaments/[id]/records/[...segments]/page')).default;
    const serverEl = await CatchAll({ params: { id: 'australian-open', segments: ['percentage','overall'] } as any });
    const { container } = render(serverEl as any);
    expect(container.querySelector('h1')).toHaveTextContent('Australian Open | Percentage Records');

    pathname = '/tournaments/australian-open/records/percentage/per-round';
    const serverEl2 = await CatchAll({ params: { id: 'australian-open', segments: ['percentage','per-round'] } as any });
    const { container: c2 } = render(serverEl2 as any);
    expect(c2.querySelector('h1')).toHaveTextContent('Australian Open | Percentage Records by Round');
  });
});
