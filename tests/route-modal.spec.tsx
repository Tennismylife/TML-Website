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

  it('restores background and avoids router navigation when modalOpenedByPush is set', async () => {
    // mark that modal was opened via push
    (window as any).__modalOpenedByPush = true;

    render(
      <RouteModal>
        <div>Modal content</div>
      </RouteModal>
    );

    const btn = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(btn);

    // wait for replaceState to have set URL to background
    await waitFor(() => expect(window.location.pathname).toBe('/tournaments/australian-open'), { timeout: 500 });
    // we should avoid calling router.replace or router.back from the component (history was restored via replaceState)
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('falls back to router.back when no modal history state is present', async () => {
    // remove modal history state to force fallback
    try { window.history.replaceState(null, '', '/somewhere-else'); } catch (e) {}

    render(
      <RouteModal>
        <div>Modal content</div>
      </RouteModal>
    );

    const btn = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(btn);

    await waitFor(() => expect(backSpy).toHaveBeenCalled(), { timeout: 500 });
  });
});