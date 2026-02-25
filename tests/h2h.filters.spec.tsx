import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// mock next/navigation hooks used by H2HFilters
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/players/p1',
  useSearchParams: () => ({ toString: () => '', get: () => null })
}));

import H2HFilters from '@/app/players/[id]/H2H/H2HFilters';
import { Match } from '@/types';

// Because the component uses debouncing and timers we may need to advance timers
vi.useFakeTimers();

describe('H2HFilters round ordering', () => {
  it('places RR before SF and F when only F-level matches present', () => {
    const matches: Match[] = [
      { id: 1, winner_id: 'a', loser_id: 'b', round: 'F', tourney_level: 'F', winner_name: 'A', loser_name: 'B' } as any,
      { id: 2, winner_id: 'c', loser_id: 'd', round: 'RR', tourney_level: 'F', winner_name: 'C', loser_name: 'D' } as any,
      { id: 3, winner_id: 'e', loser_id: 'f', round: 'SF', tourney_level: 'F', winner_name: 'E', loser_name: 'F' } as any,
    ];

    render(
      <H2HFilters
        mainPlayer="A"
        allMatches={matches}
        loading={false}
        error={null}
        filters={{ year: 'All', level: 'All', surface: 'All', round: 'All', tournament: 'All', opponent: '' }}
        setFilters={() => {}}
      />
    );

    // the round select is the fourth dropdown in the grid
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const select = selects[3];
    const options = Array.from(select.options).map(o => o.value);

    // the options should include RR first among the three
    const rrIndex = options.indexOf('RR');
    const sfIndex = options.indexOf('SF');
    const fIndex = options.indexOf('F');

    expect(rrIndex).toBeGreaterThan(-1);
    expect(sfIndex).toBeGreaterThan(-1);
    expect(fIndex).toBeGreaterThan(-1);
    expect(rrIndex).toBeLessThan(sfIndex);
    expect(sfIndex).toBeLessThan(fIndex);
  });
});
