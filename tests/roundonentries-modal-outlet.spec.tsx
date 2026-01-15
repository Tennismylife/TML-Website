import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoundOnEntriesModalOutlet from '@/components/RoundOnEntriesModalOutlet';
import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';
import { vi } from 'vitest';
import { act } from '@testing-library/react';

// shim RouteModal so tests don't require the Next app router
vi.mock('@/components/RouteModal', () => ({ default: ({ children }: any) => <div><button onClick={() => window.dispatchEvent(new CustomEvent('close-modal'))}>Close</button>{children}</div> }));

vi.mock('@/lib/tournamentHeaderCache', () => ({
  fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Test Tournament' })
}));

describe('RoundOnEntriesModalOutlets', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('tournament outlet opens and renders fetched data', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'SF', fullList: [{ id: 'p1', name: 'Player A', ioc: 'USA', reaches: 3, totalEntries: 10, percentage: 30 }] }
      ],
      tournament: { name: 'Test Tournament' }
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<RoundOnEntriesModalOutlet id={'123'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'roundsonentries', title: 'SF' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    // ensure heading uses exact phrasing
    const heading = await screen.findByText('Most SFs on Entries at Test Tournament');
    expect(heading).toBeInTheDocument();

    const name = await screen.findByText('Player A');
    expect(name).toBeInTheDocument();

    // Winner heading
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'roundsonentries', title: 'Winner' } })));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const winHeading = await screen.findByText('Most Titles on Entries at Test Tournament');
    expect(winHeading).toBeInTheDocument();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}


    // Click Close and ensure modal hides immediately
    const closeBtn = await screen.findByText('Close');
    expect(closeBtn).toBeInTheDocument();
    (closeBtn as HTMLElement).click();
    await waitFor(() => expect(screen.queryByText('Player A')).not.toBeInTheDocument());
  });

  it('records outlet opens and renders fetched data', async () => {
    const fakeResponse = {
      allRoundItems: [
        { title: 'SF', fullList: [{ id: 'p2', name: 'Player B', ioc: 'GBR', reaches: 5, totalEntries: 12, percentage: 41.7 }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<RoundOnEntriesModalOutletRecords />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'roundsonentries', title: 'SF' } })));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    // ensure heading uses exact phrasing
    const heading2 = await screen.findByText('Most SFs on Entries');
    expect(heading2).toBeInTheDocument();

    const name = await screen.findByText('Player B');
    expect(name).toBeInTheDocument();

    // Winner heading
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'roundsonentries', title: 'Winner' } })));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const winHeading2 = await screen.findByText('Most Titles on Entries');
    expect(winHeading2).toBeInTheDocument();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}


    // Click Close and ensure modal hides immediately
    const closeBtn2 = await screen.findByText('Close');
    expect(closeBtn2).toBeInTheDocument();
    (closeBtn2 as HTMLElement).click();
    await waitFor(() => expect(screen.queryByText('Player B')).not.toBeInTheDocument());
  });
});
