import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimespanModalOutlet from '@/components/TimespanModalOutlet';
import { vi } from 'vitest';

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('TimespanModalOutlet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('opens when open-modal event is dispatched and renders fetched data', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'SF', fullList: [{ id: 'p1', name: 'Player A', ioc: 'USA', firstDate: '2000-01-01', lastDate: '2020-01-01', days: 7300 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<TimespanModalOutlet id={'123'} />);

    window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'timespan', title: 'SF' } }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });
});