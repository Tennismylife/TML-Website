import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/** @vitest-environment jsdom */

import WinsSection from '@/app/records/AgeofNth/WinsSection';

describe('AgeofNth Wins - Apply button updates data immediately', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls API and replaces initialData on first Apply (n=4)', async () => {
    const initial = [{ id: 'p1', name: 'Initial Player', ioc: 'ESP', age_at_win: '22y 100d' }];
    const fetched = [{ id: 'p2', name: 'Nth Player', ioc: 'USA', age_at_win: '20y 0d' }];

    globalFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('n=4')) return { ok: true, json: async () => fetched } as any;
      return { ok: true, json: async () => initial } as any;
    });

    // sanity: direct fetch should return fetched for n=4
    const sanityRes = await fetch('/api/records/ageofnth/wins?n=4');
    const sanityJson = await sanityRes.json();
    expect(sanityJson).toEqual(fetched);

    render(
      <WinsSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={false}
        setFetchEnabled={vi.fn()}
        fetchRequestId={null}
        description={''}
        initialData={initial}
        initialNth={4}
      />
    );

    // initial data must be visible
    expect(await screen.findByText('Initial Player')).toBeTruthy();

    // click Apply immediately (input already 4)
    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn).toBeEnabled();
    const clickSpy = vi.fn();
    applyBtn.addEventListener('click', clickSpy);

    await userEvent.click(applyBtn);
    expect(clickSpy).toHaveBeenCalled();

    // should call fetch once for n=4 and update the table
    await waitFor(() => expect(globalFetch).toHaveBeenCalledTimes(2)); // one for sanity + one for Apply
    const calls = globalFetch.mock.calls.map(c => String(c[0]));
    expect(calls.some(c => c.includes('/api/records/ageofnth/wins') && c.includes('n=4'))).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Initial Player')).toBeNull());
    expect(screen.getByText('Nth Player')).toBeTruthy();
  });

  it('typing a new N then clicking Apply fetches on first click', async () => {
    const initial = [{ id: 'p1', name: 'Initial Player', ioc: 'ESP', age_at_win: '22y 100d' }];
    const fetched = [{ id: 'p2', name: 'Nth Player', ioc: 'USA', age_at_win: '20y 0d' }];

    globalFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('n=4')) return { ok: true, json: async () => fetched } as any;
      return { ok: true, json: async () => initial } as any;
    });

    render(
      <WinsSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={false}
        setFetchEnabled={vi.fn()}
        fetchRequestId={null}
        description={''}
        initialData={initial}
        initialNth={2}
      />
    );

    // initial data must be visible
    expect(await screen.findByText('Initial Player')).toBeTruthy();

    // change nth input to 4
    const nthInput = screen.getByTestId('nth-input') as HTMLInputElement;
    await userEvent.clear(nthInput);
    await userEvent.type(nthInput, '4');
    await waitFor(() => expect(nthInput).toHaveValue(4));

    // click Apply once
    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn).toBeEnabled();
    const clickSpy = vi.fn();
    applyBtn.addEventListener('click', clickSpy);

    // debug: verify DOM value visible to document.querySelector
    // eslint-disable-next-line no-console
    console.log('DEBUG nth-input DOM value before click:', (document.querySelector('[data-testid="nth-input"]') as HTMLInputElement | null)?.value);

    await userEvent.click(applyBtn);
    expect(clickSpy).toHaveBeenCalled();

    // debug: snapshot of DOM after click
    // eslint-disable-next-line no-console
    console.log('DEBUG DOM after click:', document.body.innerHTML);
    // eslint-disable-next-line no-console
    console.log('DEBUG globalFetch.calls after click:', globalFetch.mock.calls.map(c => String(c[0])));

    // should call fetch for n=4 and update the table
    await waitFor(() => expect(globalFetch).toHaveBeenCalledTimes(1));
    const calls = globalFetch.mock.calls.map(c => String(c[0]));
    expect(calls.some(c => c.includes('/api/records/ageofnth/wins') && c.includes('n=4'))).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Initial Player')).toBeNull());
    expect(screen.getByText('Nth Player')).toBeTruthy();
  });
});