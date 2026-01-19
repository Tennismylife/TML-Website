import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// stub getTournamentName and fetch responses
vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';

describe('Ages titles youngest heading and title', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders youngest winners title heading using tournament name', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ youngestWinners: [{ id: 'p1', name: 'Player One', ioc: 'USA', age: 17, year: 2022 }] }) });

    let el: any;

    await act(async () => {
      el = await (AgesFull as any)({ id: 'australian-open', section: 'titles', which: 'youngest' });
      render(el as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getByText('Youngest Title Winners at Australian Open')).toBeTruthy();
  });
});
