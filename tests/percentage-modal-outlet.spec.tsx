import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PercentageModalOutlet from '@/components/PercentageModalOutlet';
import { vi } from 'vitest';
import { act } from '@testing-library/react';

// shim RouteModal (it uses useRouter internally) so tests don't require the Next app router
vi.mock('@/components/RouteModal', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('PercentageModalOutlet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // reset history state
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('opens when open-modal event is dispatched and renders fetched data', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'R1', fullFilteredList: [{ id: 'p1', name: 'Player A', ioc: 'USA', wins: 5, losses: 0, percentage: 100 }] }
      ]
    };

    // mock fetch
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    // set global payload fallback then render
    (window as any).__lastOpenModalPayload = { section: 'percentage-rounds', title: 'R1' };
    render(<PercentageModalOutlet id={'123'} />);

    // wait for loading then data
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    // ensure the round query param was sent
    expect((fetchSpy as any).mock.calls[0][0]).toContain('round=R1');

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });

  it('ignores open-modal events for unrelated sections', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any));

    render(<PercentageModalOutlet id={'123'} />);

    // dispatch open-modal for a different section (should be ignored)
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'roundsonentries', title: 'SF' } })));

    // give a tick to allow any handlers to run
    await new Promise((r) => setTimeout(r, 50));

    // fetch should not have been called and header shouldn't be present
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.body.textContent || '').not.toContain('Overall Win Percentage');
  });

  it('opens when direct pathname contains per-round and sends round param', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'F', fullFilteredList: [{ id: 'p1', name: 'Player A', ioc: 'USA', wins: 5, losses: 0, percentage: 100 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    // simulate direct navigation to /records/percentage/rounds/F with modal state
    try { window.history.replaceState({ modal: true, background: '/tournaments/123/records', section: 'percentage-rounds', title: 'F' }, '', '/tournaments/123/records/percentage/rounds/F'); } catch (e) {}

    render(<PercentageModalOutlet id={'123'} />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    // ensure the round query param was sent
    expect((fetchSpy as any).mock.calls[0][0]).toContain('round=F');

    // ensure heading uses exact phrasing
    const heading = await screen.findByText('Best winning percentage in Finals at Test Tournament');
    expect(heading).toBeInTheDocument();

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();
  });
});