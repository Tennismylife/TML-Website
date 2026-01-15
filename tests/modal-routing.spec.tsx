import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation before importing components that use it to avoid the Next router invariant
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => {}, push: () => {}, back: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: () => null } as any),
  useParams: () => ({} as any)
}));

import CountModalOutlet from '@/components/CountModalOutlet';
import PercentageModalOutlet from '@/components/PercentageModalOutlet';

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('Modal routing collisions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch(e) {}
  });

  it('wins section dispatch opens Count modal and not Percentage', async () => {
    const countResp = { fullList: [{ id: 'p1', name: 'Count Player', ioc: 'USA', count: 5 }] };
    const pctResp = { sortedOverall: [{ id: 'p2', name: 'Pct Player', ioc: 'USA', wins: 5, losses: 0, percentage: 100 }] };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/records/count')) return Promise.resolve({ ok: true, json: () => Promise.resolve(countResp) } as any);
      if (String(url).includes('/records/percentage')) return Promise.resolve({ ok: true, json: () => Promise.resolve(pctResp) } as any);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <>
        <CountModalOutlet id={'australian-open'} />
        <PercentageModalOutlet id={'australian-open'} />
      </>
    );

    // dispatch an open-modal for wins (should open Count only)
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'wins' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    // Count fetch should have been called, Percentage fetch should not
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/count'))).toBe(true);
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/percentage'))).toBe(false);
  });

  it('percentage dispatch opens Percentage modal and not Count', async () => {
    const countResp = { fullList: [{ id: 'p1', name: 'Count Player', ioc: 'USA', count: 5 }] };
    const pctResp = { sortedOverall: [{ id: 'p2', name: 'Pct Player', ioc: 'USA', wins: 5, losses: 0, percentage: 100 }] };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/records/count')) return Promise.resolve({ ok: true, json: () => Promise.resolve(countResp) } as any);
      if (String(url).includes('/records/percentage')) return Promise.resolve({ ok: true, json: () => Promise.resolve(pctResp) } as any);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <>
        <CountModalOutlet id={'australian-open'} />
        <PercentageModalOutlet id={'australian-open'} />
      </>
    );

    // dispatch an open-modal for percentage-wins (should open Percentage only)
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'percentage-wins' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    // Percentage fetch should have been called, Count fetch should not
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/percentage'))).toBe(true);
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/count'))).toBe(false);

    fetchSpy.mockRestore();
  });

  it('closing a modal does not trigger extra fetches on the page', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/records/count')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ fullList: [{ id: 'p1' }] }) } as any);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <>
        <CountModalOutlet id={'australian-open'} />
      </>
    );

    // open the count modal (should fetch once)
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'wins' } })));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const callsBefore = fetchSpy.mock.calls.length;

    // click the close button exposed by RouteModal
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => String(b.textContent).trim() === 'Close');
    expect(closeBtn).toBeTruthy();

    act(() => { (closeBtn as HTMLButtonElement).click(); });

    // wait a bit for any stray actions to run
    await new Promise((r) => setTimeout(r, 200));

    // no additional fetches should have occurred
    expect(fetchSpy.mock.calls.length).toBe(callsBefore);

    fetchSpy.mockRestore();
  });

  it('history state on /records/count opens Count (wins) and not Percentage', async () => {
    const countResp = { fullList: [{ id: 'c1', name: 'Count Player', ioc: 'USA', count: 3 }] };
    const pctResp = { sortedOverall: [{ id: 'p1', name: 'Pct Player', ioc: 'USA', wins: 5, losses: 0, percentage: 100 }] };
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/records/count')) return Promise.resolve({ ok: true, json: () => Promise.resolve(countResp) } as any);
      if (String(url).includes('/records/percentage')) return Promise.resolve({ ok: true, json: () => Promise.resolve(pctResp) } as any);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    // simulate history state
    const state = { modal: true, background: '/tournaments/ao/records' };
    (window as any).history.replaceState(state, '', '/tournaments/ao/records/count');

    render(
      <>
        <CountModalOutlet id={'australian-open'} />
        <PercentageModalOutlet id={'australian-open'} />
      </>
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/count'))).toBe(true);
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/percentage'))).toBe(false);

    fetchSpy.mockRestore();
  });
});