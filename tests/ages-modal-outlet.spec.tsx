import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgesModalOutlet from '@/components/AgesModalOutlet';
import { vi } from 'vitest';
import { act } from '@testing-library/react';

// shim RouteModal
vi.mock('@/components/RouteModal', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('AgesModalOutlet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('opens when open-modal event is dispatched for titles and renders fetched data with correct heading', async () => {
    const fakeResponse = {
      youngestWinners: [ { id: 'p1', name: 'Player A', ioc: 'USA', age: 20.2, year: 2001, tourney_id: 'test' } ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<AgesModalOutlet id={'123'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'ages-titles', which: 'youngest' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect((fetchSpy as any).mock.calls[0][0]).toContain('/records/ages/titles?full=true');

    const heading = await screen.findByText('Youngest Title Winners at Test Tournament');
    expect(heading).toBeInTheDocument();

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });

  it('opens from direct pathname modal state and uses youngest when last segment is youngest', async () => {
    const fakeResponse = {
      youngestWinners: [ { id: 'p1', name: 'Player A', ioc: 'USA', age: 20.2, year: 2001, tourney_id: 'test' } ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    // simulate direct navigation to /records/ages/titles/youngest with modal state
    try { window.history.replaceState({ modal: true, background: '/tournaments/123/records', section: 'ages', title: 'youngest' }, '', '/tournaments/123/records/ages/titles/youngest'); } catch (e) {}

    render(<AgesModalOutlet id={'123'} />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect((fetchSpy as any).mock.calls[0][0]).toContain('/records/ages/titles?full=true');

    const heading = await screen.findByText('Youngest Title Winners at Test Tournament');
    expect(heading).toBeInTheDocument();

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });
});