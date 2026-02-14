import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/** @vitest-environment jsdom */

import WinsSection from '@/app/records/atage/WinsSection';

describe('AtAge Wins - Apply button updates data immediately', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces initialData on first Apply (age=35, surface=Clay)', async () => {
    const initial = [{ id: 'p1', name: 'Default Player', ioc: 'ESP', wins_at_age: 2 }];
    const fetched = [{ id: 'p2', name: 'New Player', ioc: 'USA', wins_at_age: 10 }];

    // initial render shows `initial` via initialData
    globalFetch.mockImplementation(async (url: any) => {
      // return fetched only when age=35 appears in query
      if (String(url).includes('age=35')) return { ok: true, json: async () => fetched } as any;
      return { ok: true, json: async () => initial } as any;
    });

    // sanity: direct fetch should return mocked `fetched` for age=35.000
    const sanityRes = await fetch('/api/records/atage/wins?age=35.000');
    const sanityJson = await sanityRes.json();
    expect(sanityJson).toEqual(fetched);

    render(
      <WinsSection
        selectedSurfaces={["Clay"]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={false}
        initialAge={25}
        initialData={initial}
      />
    );

    // default player should be visible
    expect(await screen.findByText('Default Player')).toBeTruthy();

    // change age inputs to 35y 0d (the inputs have no accessible name, select by role index)
    const spinbuttons = screen.getAllByRole('spinbutton');
    const yearsInput = spinbuttons[0];
    const daysInput = spinbuttons[1];
    await userEvent.clear(yearsInput);
    await userEvent.type(yearsInput, '35');
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, '0');

    // ensure DOM inputs updated
    await waitFor(() => expect(spinbuttons[0]).toHaveValue(35));
    await waitFor(() => expect(spinbuttons[1]).toHaveValue(0));

    // sanity fetch consumed one call
    expect(globalFetch).toHaveBeenCalledTimes(1);

    // click Apply
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    // sanity: ensure native click event is dispatched
    const clickSpy = vi.fn();
    applyBtn.addEventListener('click', clickSpy);
    await userEvent.click(applyBtn);
    expect(clickSpy).toHaveBeenCalled();

    // should call fetch with age=35.000 (second overall call)
    await waitFor(() => expect(globalFetch).toHaveBeenCalledTimes(2));
    // debug: print calls
    // eslint-disable-next-line no-console
    console.log('DEBUG fetch calls:', globalFetch.mock.calls.map(c => String(c[0])));
    await waitFor(() => {
      const calls = globalFetch.mock.calls.map(c => String(c[0]));
      // second call must include the age=35.000 filter
      expect(calls[1] && calls[1].includes('/api/records/atage/wins') && calls[1].includes('age=35.000')).toBeTruthy();
    });

    // and update the table to show New Player
    await waitFor(() => expect(screen.queryByText('Default Player')).toBeNull());
    expect(screen.getByText('New Player')).toBeTruthy();
  });
});