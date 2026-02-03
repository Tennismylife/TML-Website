import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeastModalOutlet from '@/components/LeastModalOutlet';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('Records links point to player matches tab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('LeastModalOutlet links point to /players/:slug/matches when slug available', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'SF', fullFilteredList: [{ id: 'D643', player: { id: 'D643', name: 'Novak Djokovic', slug: 'novak-djokovic', ioc: 'SRB' }, minGamesLost: 3, year: 2001 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<LeastModalOutlet id={'123'} />);
    const { act } = await import('@testing-library/react');
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'least', title: 'SF' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const link = await screen.findByRole('link', { name: /Novak Djokovic/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href') || '').toContain('/players/novak-djokovic/matches');
  });
});