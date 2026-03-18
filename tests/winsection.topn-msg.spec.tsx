import { render, screen } from '@testing-library/react';
import Wins from '../app/records/wins/wins';
import React from 'react';

description('Wins component empty state with top‑N filter', () => {
  it('shows explanatory message when top‑N filter yields no results', () => {
    render(<Wins topWinners={[]} fetchEnabled={false} selectedSurfaces={new Set()} selectedLevels={new Set()} selectedRounds={''} selectedBestOf={null} selectedTopN={5} />);
    expect(screen.getByText(/No career wins against top 5 opponents/i)).toBeInTheDocument();
  });
});
