import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LeastSection from '../app/tournaments/[id]/records/LeastSection';
import { vi } from 'vitest';

describe('LeastSection link behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses per-item tourney_id when provided (e.g., 581)', async () => {
    const mockResponse = {
      roundItems: [
        {
          round: 'F',
          data: [
            { year: 1977, minGamesLost: 3, player: { id: 'P1', name: 'Baz Player', ioc: 'USA' }, tourney_id: '581' }
          ]
        }
      ]
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any);

    render(<LeastSection id="australian-open" />);

    await waitFor(() => expect(screen.getByText('Baz Player')).toBeInTheDocument());

    const anchor = screen.getByText('1977').closest('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toContain('/tournaments/581/1977');
  });
});