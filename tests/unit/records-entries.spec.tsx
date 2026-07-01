/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import Entries from '@/app/records/Entries/Entries';

let pathname = '/records/most-grand-slam-appearances';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => ({
    entries: () => [],
  }),
}));

describe('Records entries narrative', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pathname = '/records/most-grand-slam-appearances';
  });

  it('uses the fetched Grand Slam entry total for Djokovic in the narrative', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        topEntries: [
          { id: 'D643', name: 'Novak Djokovic', ioc: 'SRB', entries: 83, slug: 'novak-djokovic' },
          { id: 'F324', name: 'Roger Federer', ioc: 'CHE', entries: 82, slug: 'roger-federer' },
          { id: 'L188', name: 'Feliciano Lopez', ioc: 'ESP', entries: 82, slug: 'feliciano-lopez' },
        ],
      }),
    } as any);

    render(
      <Entries
        topEntries={[
          { id: 'D643', name: 'Novak Djokovic', ioc: 'SRB', entries: 82, slug: 'novak-djokovic' },
          { id: 'F324', name: 'Roger Federer', ioc: 'CHE', entries: 81, slug: 'roger-federer' },
          { id: 'L188', name: 'Feliciano Lopez', ioc: 'ESP', entries: 81, slug: 'feliciano-lopez' },
        ]}
        selectedLevels={new Set(['G'])}
        selectedSurfaces={new Set()}
      />
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const openingParagraph = screen.getByText(/At the top of the men/i);
    expect(openingParagraph).toHaveTextContent('83 Grand Slam singles main draws');
    expect(openingParagraph).toHaveTextContent('82');

    const closingParagraph = screen.getByText(/In this record, the milestone is not winning matches/i);
    expect(closingParagraph).toHaveTextContent('83');
    expect(closingParagraph).toHaveTextContent('82');
  });
});
