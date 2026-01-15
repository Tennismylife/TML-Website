import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

import CountModalOutlet from '@/components/CountModalOutlet';

describe('CountModalOutlet entries heading', () => {
  it('shows Most Entries at Australian Open for entries section', async () => {
    render(<CountModalOutlet id={'australian-open'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'entries' } })));

    await waitFor(() => expect(document.body.textContent || '').toContain('Most Entries at Australian Open'));
  });
});
