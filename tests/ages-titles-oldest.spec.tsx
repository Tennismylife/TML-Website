import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/lib/getTournamentName', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/getTournamentName';

describe('Ages titles oldest heading and title', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders oldest winners title heading using tournament name', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ oldestWinners: [{ id: 'p1', name: 'Player One', ioc: 'USA', age: 34, year: 1998 }] }) });

    let el: any;

    await act(async () => {
      el = await (AgesFull as any)({ id: 'australian-open', section: 'titles', which: 'oldest' });
      render(el as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getAllByText('Oldest Title Winners at Australian Open').length).toBeGreaterThan(0);
  });
});