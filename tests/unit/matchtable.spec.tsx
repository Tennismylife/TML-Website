import React from 'react';
import { render, screen } from '@testing-library/react';
import MatchTable from '../../components/MatchTable';
import { vi } from 'vitest';

describe('MatchTable', () => {
  it('shows Loading... when loading prop is true', () => {
    render(
      <MatchTable
        matches={[]}
        loading={true}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'p'}
      />
    );

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows No matches found. when not loading and no matches', () => {
    render(
      <MatchTable
        matches={[]}
        loading={false}
        sortKey={'tourney_date'}
        sortDir={'desc'}
        setSortKey={vi.fn()}
        setSortDir={vi.fn()}
        playerId={'p'}
      />
    );

    expect(screen.getByText('No matches found.')).toBeTruthy();
  });
});