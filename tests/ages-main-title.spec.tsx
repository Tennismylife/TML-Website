import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// stub getTournamentName and fetch responses
vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';

describe('Ages full main headings and titles', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders youngest main heading using tournament name', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ topYoungest: [{ id: 'p1', name: 'Player One', ioc: 'USA', age: 17, year: 2022 }] }) });

    await act(async () => {
      render(<AgesFull id={"australian-open"} section="main" which="youngest" /> as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getByText('Youngest Players in Main Draw at Australian Open')).toBeTruthy();
  });

  it('renders oldest main heading using tournament name', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ topOldest: [{ id: 'p2', name: 'Player Two', ioc: 'GBR', age: 40, year: 1995 }] }) });

    await act(async () => {
      render(<AgesFull id={"australian-open"} section="main" which="oldest" /> as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getByText('Oldest Players in Main Draw at Australian Open')).toBeTruthy();
  });
});
