import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/** @vitest-environment jsdom */

import TitlesSection from '@/app/records/AgeofNth/TitlesSection';

describe('AgeofNth Titles - Apply button updates data immediately', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('typing a new N then clicking Apply fetches on first click', async () => {
    const initial = [{ id: 'p1', name: 'Initial Player', ioc: 'ESP', age_at_title: '30y 10d' }];
    const fetched = [{ id: 'p2', name: 'Nth Player', ioc: 'USA', age_at_title: '25y 0d' }];

    globalFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('n=4')) return { ok: true, json: async () => fetched } as any;
      return { ok: true, json: async () => initial } as any;
    });

    render(
      <TitlesSection
        selectedSurfaces={[]}
        selectedLevels={[]}
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

    // clearing the input should show an empty field (not "0")
    await userEvent.clear(nthInput);
    expect(nthInput.value).toBe('');

    // re-type 4 and click Apply once
    await userEvent.type(nthInput, '4');
    await waitFor(() => expect(nthInput).toHaveValue(4));

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn).toBeEnabled();
    const clickSpy = vi.fn();
    applyBtn.addEventListener('click', clickSpy);

    await userEvent.click(applyBtn);
    expect(clickSpy).toHaveBeenCalled();

    // should call fetch for n=4 and update the table
    await waitFor(() => expect(globalFetch).toHaveBeenCalledTimes(1));
    const calls = globalFetch.mock.calls.map(c => String(c[0]));
    expect(calls.some(c => c.includes('/api/records/ageofnth/titles') && c.includes('n=4'))).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Initial Player')).toBeNull());
    expect(screen.getByText('Nth Player')).toBeTruthy();
  });
});
