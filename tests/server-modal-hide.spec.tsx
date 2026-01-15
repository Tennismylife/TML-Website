import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({}) }));
vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

import CountModalOutlet from '@/components/CountModalOutlet';
import RoundsModalOutlet from '@/components/RoundsModalOutlet';

describe('Server modal hide', () => {
  beforeEach(() => {
    // insert a fake server modal into DOM
    const div = document.createElement('div');
    div.className = 'server-modal-content';
    div.id = 'fake-server-modal';
    document.body.appendChild(div);
  });
  afterEach(() => {
    const el = document.getElementById('fake-server-modal');
    if (el) el.remove();
  });

  it('Count outlet hides server modal when opening', async () => {
    render(<CountModalOutlet id={'australian-open'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'wins' } })));

    await waitFor(() => expect((document.getElementById('fake-server-modal') as HTMLElement).style.display).toBe('none'));
  });

  it('Rounds outlet hides server modal when opening', async () => {
    render(<RoundsModalOutlet id={'australian-open'} />);

    act(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'rounds', title: 'Final' } })));

    await waitFor(() => expect((document.getElementById('fake-server-modal') as HTMLElement).style.display).toBe('none'));
  });
});
