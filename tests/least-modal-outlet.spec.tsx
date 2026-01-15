import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeastModalOutlet from '@/components/LeastModalOutlet';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('LeastModalOutlet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('opens when open-modal event is dispatched and renders fetched data', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'SF', fullFilteredList: [{ id: 'p1', player: { id: 'p1', name: 'Player A', ioc: 'USA' }, minGamesLost: 3, year: 2001 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<LeastModalOutlet id={'123'} />);

    // dispatch within act to avoid React state warnings
    const { act } = await import('@testing-library/react');
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'least', title: 'SF' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    // dispatching a non-least section should NOT open least modal
    const spy2 = vi.spyOn(window, 'fetch');
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'rounds', title: 'SF' } })));
    // small delay
    await new Promise((r) => setTimeout(r, 20));
    expect(spy2).toHaveBeenCalled(); // original spy was called earlier
    // ensure no additional calls caused by 'rounds'
    expect(spy2).toHaveBeenCalledTimes(1);
    spy2.mockRestore();

    expect(await screen.findByText('Least games lost to reach SF at Test Tournament')).toBeInTheDocument();
    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });

  it('does not warn when duplicate ids are present', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'F', fullFilteredList: [
          { id: 'R075', player: { id: 'R075', name: 'Player A', ioc: 'AUS' }, minGamesLost: 1, year: 1999 },
          { id: 'R075', player: { id: 'R075', name: 'Player A', ioc: 'AUS' }, minGamesLost: 2, year: 2000 }
        ] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LeastModalOutlet id={'123'} />);
    const { act } = await import('@testing-library/react');
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'least', title: 'F' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(await screen.findByText('Least games lost to reach F at Test Tournament')).toBeInTheDocument();
    expect(consoleErr).not.toHaveBeenCalledWith(expect.stringContaining('Encountered two children with the same key'));

    consoleErr.mockRestore();
  });

  it('opens when open-modal event with W and renders heading for win title', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'W', fullFilteredList: [{ id: 'p4', player: { id: 'p4', name: 'Player D', ioc: 'ESP' }, minGamesLost: 10, year: 2020 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<LeastModalOutlet id={'123'} />);
    const { act } = await import('@testing-library/react');
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'least', title: 'W' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(await screen.findByText('Least games lost to win title at Test Tournament')).toBeInTheDocument();
    const name = await screen.findByText('Player D');
    expect(name).toBeInTheDocument();
  });

  it('opens when history state is modal and renders fetched data', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'F', fullFilteredList: [{ id: 'p2', player: { id: 'p2', name: 'Player B', ioc: 'GBR' }, minGamesLost: 5, year: 2005 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    try { window.history.replaceState({ modal: true, background: '/tournaments/123/records', section: 'least', title: 'F' }, '', '/tournaments/123/records/least/rounds/F'); } catch (e) {}

    render(<LeastModalOutlet id={'123'} />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(await screen.findByText('Least games lost to reach F at Test Tournament')).toBeInTheDocument();
    const name = await screen.findByText('Player B');
    expect(name).toBeInTheDocument();
  });

  it('does not auto-open modal on direct pathname navigation (server page should render instead)', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'F', fullFilteredList: [{ id: 'p3', player: { id: 'p3', name: 'Player C', ioc: 'FRA' }, minGamesLost: 7, year: 2010 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    // simulate visiting /tournaments/123/records/least/rounds/F directly
    try { window.history.replaceState(null, '', '/tournaments/123/records/least/rounds/F'); } catch (e) {}

    render(<LeastModalOutlet id={'123'} />);

    // Since the direct pathname should be handled by server page, the modal outlet must not fetch data by itself
    await new Promise((res) => setTimeout(res, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});