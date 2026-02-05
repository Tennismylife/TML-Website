import React from 'react';
import { render, screen } from '@testing-library/react';
import SummarySeasons from '@/app/players/[id]/season/components/SummarySeasons';

describe('SummarySeasons', () => {
  it('builds View All Matches link using playerSlug when provided', () => {
    render(
      <SummarySeasons
        years={[2024]}
        allMatches={[]}
        playerId={'A0E2'}
        playerSlug={'carlos-alcaraz'}
        selectedYear={2024}
      />
    );

    const link = screen.getByRole('link', { name: /View All Matches/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href') || '').toContain('/players/carlos-alcaraz/matches?year=2024');
  });

  it('falls back to playerId when playerSlug is not provided', () => {
    render(
      <SummarySeasons
        years={[2024]}
        allMatches={[]}
        playerId={'A0E2'}
        selectedYear={2024}
      />
    );

    const link = screen.getByRole('link', { name: /View All Matches/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href') || '').toContain('/players/A0E2/matches?year=2024');
  });
});