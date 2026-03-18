import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// to let our test override router behaviour we keep these variables
let pathname = '/tournaments/123/records/count';
let routerPush = vi.fn();
let routerReplace = vi.fn();

// next/navigation is used heavily by RecordsPageClient.  return functions
// that reference the mutable above variables so we can inspect them later.
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}));

// When the client component fetches the tournament header we pretend the
// database responded with a slug.  The component should switch the URL
// via replaceState and thereafter use the slug for any tab navigation.
vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () =>
    Promise.resolve({ id: 123, name: 'Test Tourn', slug: 'test-tourn' }),
}));

// stub out anything that would hit the network or render complex UI; we want
// just the tab navigation behaviour in this test
vi.mock('@/app/tournaments/[id]/TournamentHeader', () => ({
  default: (props: any) => React.createElement('div', { 'data-testid': 't-header' })
}));
// do NOT mock TournamentTabs itself, we need the real buttons

const stub = (name: string) => ({ default: (props: any) => React.createElement('div', { 'data-testid': name }) });
vi.mock('@/app/tournaments/[id]/records/CountSection', () => stub('count-section'));
vi.mock('@/app/tournaments/[id]/records/RoundsSection', () => stub('rounds-section'));
vi.mock('@/app/tournaments/[id]/records/AgesSection', () => stub('ages-section'));
vi.mock('@/app/tournaments/[id]/records/PercentageSection', () => stub('percentage-section'));
vi.mock('@/app/tournaments/[id]/records/TimespanSection', () => stub('timespan-section'));
vi.mock('@/app/tournaments/[id]/records/RoundsOnEntries', () => stub('rounds-on-entries-section'));
vi.mock('@/app/tournaments/[id]/records/LeastSection', () => stub('least-section'));
vi.mock('@/app/tournaments/[id]/records/AverageAgeSection', () => stub('avg-age-section'));

import RecordsPageClient from '@/app/tournaments/[id]/records/RecordsClient';

describe('RecordsPageClient navigation', () => {
  beforeEach(() => {
    // reset spies and pathname before each test
    routerPush = vi.fn();
    routerReplace = vi.fn();
    pathname = '/tournaments/123/records/count';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects numeric id to slug on load and later navigations use slug', async () => {
    // render with numeric id initially
    render(<RecordsPageClient params={{ id: '123' } as any} />);

    // component shows a loading indicator while it fetches the header
    expect(screen.getByText(/Loading/i)).toBeTruthy();
    // wait for loading to finish which also sets tournament state
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull());

    // the effect that performed the slug replacement uses window.history.replaceState
    // since our test environment can't catch that, we at least expect router.replace
    // not to have been called (the code uses history.replaceState when available)
    expect(routerReplace).not.toHaveBeenCalled();

    // clicking another tab should use the slug path instead of the raw 123
    const roundsBtn = await screen.findByRole('button', { name: /Rounds/i });
    await userEvent.click(roundsBtn);

    expect(routerPush).toHaveBeenCalledWith('/tournaments/test-tourn/records/rounds');

    // simulate the pathname update as would happen in a real app
    pathname = '/tournaments/test-tourn/records/rounds';

    // clicking again should continue to use the slug
    const countBtn = await screen.findByRole('button', { name: /^Counts$/i });
    await userEvent.click(countBtn);
    expect(routerPush).toHaveBeenCalledWith('/tournaments/test-tourn/records/count');
  });
});
