import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AgesSection from '../app/tournaments/[id]/records/AgesSection';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('AgesSection link behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders edition links using provided pathId when no tourney_id', async () => {
    const mockResponse = {
      topYoungest: [
        { id: 'P1', name: 'Foo Player', ioc: 'USA', age: 20.1, year: 1972 },
      ],
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any);

    render(<AgesSection id="australian-open" linkId={580} pathId="australian-open" activeSubTab="main" />);

    await waitFor(() => expect(screen.getByText('Foo Player')).toBeInTheDocument());

    const anchor = screen.getByText('1972').closest('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toContain('/tournaments/australian-open/1972');
  });

  it('prefers per-item tourney_id when present (e.g., 581)', async () => {
    const mockResponse = {
      topYoungest: [
        { id: 'P2', name: 'Bar Player', ioc: 'USA', age: 19.0, year: 1977, tourney_id: '581' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any);

    render(<AgesSection id="australian-open" pathId="australian-open" activeSubTab="main" />);

    await waitFor(() => expect(screen.getByText('Bar Player')).toBeInTheDocument());

    const anchor = screen.getByText('1977').closest('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toContain('/tournaments/581/1977');
  });

  it('maps numeric tourney_id equal to current linkId back to the pathId slug', async () => {
    const mockResponse = {
      topYoungest: [
        { id: 'P3', name: 'Slug Player', ioc: 'USA', age: 21.5, year: 2000, tourney_id: '404' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any);

    render(<AgesSection id="indian-wells-masters" linkId={404} pathId="indian-wells-masters" activeSubTab="main" />);

    await waitFor(() => expect(screen.getByText('Slug Player')).toBeInTheDocument());

    const anchor = screen.getByText('2000').closest('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toContain('/tournaments/indian-wells-masters/2000');
  });
});