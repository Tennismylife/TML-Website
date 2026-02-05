import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

/** @vitest-environment jsdom */

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import LatestMatches from '@/components/LatestMatches';

// Mock fetch for latest matches
const mockMatches = [
  {
    id: '1',
    tourney_id: '2026-1',
    tourney_name: 'Test Open',
    tourney_date: '2026-01-01',
    round: 'F',
    winner_id: '123',
    winner_slug: 'tallon-griekspoor',
    winner_name: 'Tallon Griekspoor',
    loser_id: '456',
    loser_slug: 'opponent',
    loser_name: 'Opponent',
    score: '6-3 6-4'
  }
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: any) => {
    if (typeof url === 'string' && url.includes('/api/matches/latest')) {
      return { ok: true, json: async () => mockMatches } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LatestMatches', () => {
  it('renders player links that include /matches suffix', async () => {
    render(<LatestMatches />);

    const winnerLink = await screen.findByRole('link', { name: /Tallon Griekspoor/i });
    expect(winnerLink).toBeInTheDocument();
    expect(winnerLink.getAttribute('href') || '').toContain('/players/tallon-griekspoor/matches');

    const loserLink = await screen.findByRole('link', { name: /Opponent/i });
    expect(loserLink.getAttribute('href') || '').toContain('/players/opponent/matches');
  });
});