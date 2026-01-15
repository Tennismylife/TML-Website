import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RouteModal from '@/components/RouteModal';
import { vi } from 'vitest';

// Mock next/navigation useRouter
const replaceSpy = vi.fn();
const backSpy = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceSpy, back: backSpy })
}));

describe('RouteModal close navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // set a modal-like history state and background
    try { window.history.replaceState({ modal: true, background: '/tournaments/australian-open' }, '', '/tournaments/australian-open/records/rounds-on-entries/rounds/SF'); } catch (e) {}
    (window as any).__modalBackgroundPath = '/tournaments/australian-open';
  });

  afterEach(() => {
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
    try { delete (window as any).__modalBackgroundPath; } catch (e) {}
  });

  it('uses router.replace to restore background and avoids history.back when modalOpenedByPush is set', async () => {
    // mark that modal was opened via push
    (window as any).__modalOpenedByPush = true;

    render(
      <RouteModal>
        <div>Modal content</div>
      </RouteModal>
    );

    const btn = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(btn);

    // wait for the internal timeout (55ms) to run
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/tournaments/australian-open'), { timeout: 500 });
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('falls back to history.back if router.replace throws', async () => {
    // make replace throw
    replaceSpy.mockImplementation(() => { throw new Error('router fail'); });
    (window as any).__modalOpenedByPush = true;

    // spy on history.back
    const histBack = vi.spyOn(window.history, 'back').mockImplementation(() => {} as any);

    render(
      <RouteModal>
        <div>Modal content</div>
      </RouteModal>
    );

    const btn = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(btn);

    await waitFor(() => expect(histBack).toHaveBeenCalled(), { timeout: 500 });

    histBack.mockRestore();
  });
});