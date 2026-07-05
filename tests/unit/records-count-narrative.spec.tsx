/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import Count from '@/app/records/Count/Count';

let pathname = '/records/most-grand-slam-quarterfinals-reached';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => ({
    entries: () => [],
  }),
}));

describe('Records count narrative', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pathname = '/records/most-grand-slam-quarterfinals-reached';
  });

  it('uses the fetched Grand Slam quarterfinal total for Djokovic in the narrative', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        top: [
          { id: 'D643', name: 'Novak Djokovic', ioc: 'SRB', count: 65, slug: 'novak-djokovic' },
          { id: 'F324', name: 'Roger Federer', ioc: 'CHE', count: 58, slug: 'roger-federer' },
        ],
      }),
    } as any);

    render(
      <Count
        topCount={[
          { id: 'D643', name: 'Novak Djokovic', ioc: 'SRB', count: 64, slug: 'novak-djokovic' },
          { id: 'F324', name: 'Roger Federer', ioc: 'CHE', count: 58, slug: 'roger-federer' },
        ]}
        selectedRounds="QF"
        selectedLevels={new Set(['G'])}
        selectedSurfaces={new Set()}
      />
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const openingParagraph = screen.getByText(/At the top of the men/i);
    expect(openingParagraph).toHaveTextContent('65 Grand Slam quarter-finals or better');
    expect(openingParagraph).not.toHaveTextContent('64 Grand Slam quarter-finals or better');
  });
});
