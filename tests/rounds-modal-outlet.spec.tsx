import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

import RoundsModalOutlet from '@/components/RoundsModalOutlet';

describe('RoundsModalOutlet', () => {
  it('opens when open-modal with namespaced payload and fetches list', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/records/rounds')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ roundItems: [{ fullList: [{ id: 'p1', name: 'Player 1', ioc: 'USA', count: 3 }] }] }) } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(<RoundsModalOutlet id={'australian-open'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'rounds', title: 'R128' } }))); 

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/records/rounds'))).toBe(true);

    // heading should reflect requested phrasing
    await waitFor(() => expect(document.body.textContent || '').toContain('Most Round of 128 Appearances at the Australian Open'));

    fetchSpy.mockRestore();
  });
});
