import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

import WinsSection from '@/app/records/atage/WinsSection';
import EntriesSection from '@/app/records/atage/EntriesSection';

describe('AtAge After checkbox', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends after=1 when After checkbox is toggled', async () => {
    const playerResults = [{ id: 'p1', name: 'Player 1', ioc: 'ESP', wins_at_age: 5 }];
    globalFetch.mockImplementation(async (url: any) => {
      return { ok: true, json: async () => playerResults } as any;
    });

    render(<WinsSection selectedSurfaces={[]} selectedLevels={[]} selectedRounds={''} selectedBestOf={null} fetchEnabled={true} initialAge={25} />);

    // Check After checkbox
    const afterCheckbox = await screen.findByRole('checkbox');
    const user = userEvent.setup();
    await user.click(afterCheckbox);

    // Ensure fetch was called with after=1 in query string
    await waitFor(() => {
      const called = globalFetch.mock.calls.map(c => String(c[0]));
      expect(called.some(u => u.includes('atage/wins') && u.includes('after=1'))).toBeTruthy();
    });
  });

  it('sends after=1 when After checkbox is toggled in EntriesSection', async () => {
    const res = [{ id: 'p2', name: 'Player 2', ioc: 'USA', participations_at_age: 3 }];
    globalFetch.mockImplementation(async (url: any) => {
      return { ok: true, json: async () => res } as any;
    });

    render(<EntriesSection selectedSurfaces={[]} selectedLevels={[]} fetchEnabled={true} initialAge={25} />);

    const afterCheckbox = await screen.findByRole('checkbox');
    const user = userEvent.setup();
    await user.click(afterCheckbox);

    await waitFor(() => {
      const called = globalFetch.mock.calls.map(c => String(c[0]));
      expect(called.some(u => u.includes('atage/entries') && u.includes('after=1'))).toBeTruthy();
    });
  });

  it('sends after=1 when After checkbox is toggled in PlayedSection', async () => {
    const res = [{ id: 'p3', name: 'Player 3', ioc: 'FRA', played_at_age: 2 }];
    globalFetch.mockImplementation(async (url: any) => {
      return { ok: true, json: async () => res } as any;
    });

    const { default: PlayedSection } = await import('@/app/records/atage/PlayedSection');
    render(<PlayedSection selectedSurfaces={[]} selectedLevels={[]} selectedRounds={''} selectedBestOf={null} fetchEnabled={true} initialAge={25} />);

    const afterCheckbox = await screen.findByRole('checkbox');
    const user = userEvent.setup();
    await user.click(afterCheckbox);

    await waitFor(() => {
      const called = globalFetch.mock.calls.map(c => String(c[0]));
      expect(called.some(u => u.includes('atage/played') && u.includes('after=1'))).toBeTruthy();
    });
  });
});