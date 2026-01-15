import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/lib/recordMetadata', () => ({
  getTournamentName: vi.fn().mockResolvedValue('Australian Open'),
}));

import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';

describe('Ages youngestrounds per-round heading and title', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders youngest in F heading using tournament name', async () => {
    const mockItems = [{ title: 'F', list: [ { id: 'p1', name: 'Player One', ioc: 'USA', age: 17, year: 2022 } ], fullList: [ { id: 'p1', name: 'Player One', ioc: 'USA', age: 17, year: 2022 } ] }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ allYoungestItems: mockItems }) });

    await act(async () => {
      render(<AgesFull id={"australian-open"} section="youngestrounds" title="F" /> as any);
    });

    expect(getTournamentName).toHaveBeenCalledWith('australian-open');
    expect(screen.getByText('Youngest Players in F at Australian Open')).toBeTruthy();
  });
});