import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

import CountModalOutlet from '@/components/CountModalOutlet';

describe('CountModalOutlet headings', () => {
  it('shows Most Wins At Australian Open for wins section', async () => {
    render(<CountModalOutlet id={'australian-open'} />);

    // dispatch open-modal for wins
    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'wins' } })));

    // wait for heading to appear
    await waitFor(() => expect(document.body.textContent || '').toContain('Most Wins At Australian Open'));
  });
});
