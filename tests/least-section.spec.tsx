import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import LeastSection from '@/app/tournaments/[id]/records/LeastSection';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));

describe('LeastSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
  });

  it('View All pushes history state and dispatches open-modal', async () => {
    const fakeResponse = {
      roundItems: [
        { round: 'SF', data: [{ year: 2001, minGamesLost: 3, player: { id: 'p1', name: 'Player A', ioc: 'USA' }, tourney_id: '123' }] }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url: any) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) } as any);
    });

    render(<LeastSection id={'123'} /> as any);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const btn = await screen.findByText('View All');

    // spy on open-modal dispatch
    const dispatched: any[] = [];
    const handler = (e: any) => dispatched.push(e.detail);
    window.addEventListener('open-modal', handler as any);

    fireEvent.click(btn);

    await waitFor(() => {
      // assert history state updated
      const st = (window as any).history.state;
      expect(st).toBeTruthy();
      expect(st.modal).toBe(true);
      expect(st.section).toBe('least');
      expect(st.title).toBe('SF');
      // assert event dispatched
      expect(dispatched.length).toBeGreaterThan(0);
      expect(dispatched[0].section).toBe('least');
      expect(dispatched[0].title).toBe('SF');
      // assert fallback payload is set so outlets that mount later can still open
      expect((window as any).__lastOpenModalPayload).toEqual({ section: 'least', title: 'SF' });
    });

    window.removeEventListener('open-modal', handler as any);
  });
});