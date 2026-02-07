import { render, screen, waitFor } from '@testing-library/react';
/** @vitest-environment jsdom */
import React from 'react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import Titles from '../app/records/roundsonentries/titles';

beforeEach(() => {
  vi.resetModules();
});

describe('Roundsonentries Titles links', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links players to matches tab when slug available', async () => {
    const fake = {
      FinalWins: [
        { id: 'p1', name: 'Mats Wilander', ioc: 'SWE', wins: 3, entries: 5, percentage: 60, slug: 'mats-wilander' }
      ]
    };

    global.fetch = vi.fn(async () => ({ ok: true, json: async () => fake })) as any;

    render(<Titles selectedSurfaces={new Set()} selectedLevels={new Set()} minEntries={0} fetchEnabled={true} fetchRequestId={'r1'} />);

    await waitFor(() => expect(screen.getByText('Mats Wilander')).toBeTruthy());

    const link = screen.getByRole('link', { name: /Mats Wilander/i }) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    // Should point to /players/mats-wilander/matches
    expect(link.getAttribute('href')).toBe('/players/mats-wilander/matches');
  });
});