import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';

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

    await act(async () => {
      render(<AgesFull id={"australian-open"} section="titles" which="oldest" /> as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getByText('Oldest Title Winners at Australian Open')).toBeTruthy();
  });
});