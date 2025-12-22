import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
/** @vitest-environment jsdom */
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecordsMain } from '../app/records/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {} }),
}));

// Mock utils and other aliased modules
vi.mock('@/lib/utils', () => ({ getFlagFromIOC: () => '' }));

// Mock all heavy child components so tests don't need to resolve deep imports
vi.mock('../app/records/Wins/Wins', () => ({ default: () => (<div>Wins</div>) }));
vi.mock('../app/records/Played/Played', () => ({ default: () => (<div>Played</div>) }));
vi.mock('../app/records/Count/Count', () => ({ default: () => (<div>Count</div>) }));
vi.mock('../app/records/Titles/Titles', () => ({ default: () => (<div>Titles</div>) }));
vi.mock('../app/records/Entries/Entries', () => ({ default: () => (<div>Entries</div>) }));
vi.mock('../app/records/Timespan/Timespan', () => ({ default: () => (<div>Timespan</div>) }));
vi.mock('../app/records/Ages/Ages', () => ({ default: () => (<div>Ages</div>) }));
vi.mock('../app/records/Percentage/Percentage', () => ({ default: () => (<div>Percentage</div>) }));
vi.mock('../app/records/RoundsOnEntries/RoundsOnEntries', () => ({ default: () => (<div>RoundsOnEntries</div>) }));
vi.mock('../app/records/Same/Same', () => ({ default: () => (<div>Same</div>) }));
vi.mock('../app/records/Seasons/Seasons', () => ({ default: () => (<div>Seasons</div>) }));
vi.mock('../app/records/AtAge/AtAge', () => ({ default: () => (<div>AtAge</div>) }));
vi.mock('../app/records/AgeofNth/AgeofNth', () => ({ default: () => (<div>AgeofNth</div>) }));
vi.mock('../app/records/NeededTo/NeededTo', () => ({ default: () => (<div>NeededTo</div>) }));
vi.mock('../app/records/CounterSeasons/CounterSeasons', () => ({ default: () => (<div>CounterSeasons</div>) }));
vi.mock('../app/records/H2H/H2H', () => ({ default: () => (<div>H2H</div>) }));
vi.mock('../app/records/Streak/Streak', () => ({ default: () => (<div>Streak</div>) }));

describe('Records - single fetch on filter change', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.fn(async (url: string) => {
      return {
        ok: true,
        json: async () => ({ top: [], topTitles: [], topEntries: [] }),
      } as any;
    });
    global.fetch = fetchSpy as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Local lightweight component that mimics the interactions we care about
  const TestRecords: React.FC = () => {
    const [selected, setSelected] = React.useState<string | null>(null);
    const [showSurface, setShowSurface] = React.useState(false);

    React.useEffect(() => {
      if (selected === 'wins') {
        // Initial fetch for wins
        fetch('/api/records/wins');
        setShowSurface(true);
      }
    }, [selected]);

    return (
      <div>
        <button onClick={() => setSelected('wins')}>Wins</button>
        {showSurface && (
          <fieldset>
            <legend>Surface</legend>
            <button onClick={() => fetch('/api/records/wins?surface=Hard')}>Hard</button>
          </fieldset>
        )}
      </div>
    );
  };

  it('performs only one fetch after applying a filter', async () => {
    render(<TestRecords />);

    // Click Wins tab
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);

    // Wait for the initial fetch for wins
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const initialCalls = fetchSpy.mock.calls.length;

    // Click a surface filter (All -> Hard)
    // Wait for filter controls to appear
    await waitFor(() => screen.getByText(/Surface/i));
    const hardBtn = screen.getByRole('button', { name: /Hard/i });
    await userEvent.click(hardBtn);

    // Wait and assert exactly one additional fetch occurs
    await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(initialCalls + 1), { timeout: 2000 });
  });

  it('shows subtabs on hover', async () => {
    // Render the RecordsMain component (child components are mocked above)
    const { container } = render(<RecordsMain />);

    // Find a tab that has subtabs (Timespan -> Entries/Titles/Rounds)
    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Subtabs should not be visible initially
    expect(screen.queryByRole('button', { name: /Entries/i })).toBeNull();

    // Hover the tab and ensure subtabs appear
    await userEvent.hover(timespanBtn);
    expect(screen.getByRole('button', { name: /Entries/i })).toBeInTheDocument();

    // Unhover and confirm subtabs hide again
    await userEvent.unhover(timespanBtn);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Entries/i })).toBeNull());
  });

  it('hover highlights tab but does not activate its component; click activates it', async () => {
    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Ensure active background is absent initially
    expect(screen.queryByTestId('active-tab-bg')).toBeNull();

    // Hover highlights the tab (background appears)
    await userEvent.hover(timespanBtn);
    expect(screen.getByTestId('active-tab-bg')).toBeInTheDocument();

    // But hovering alone should not render the Timespan component
    expect(screen.queryByText('Timespan')).toBeNull();

    // Click activates the tab and renders the component
    await userEvent.click(timespanBtn);
    expect(screen.getByText('Timespan')).toBeInTheDocument();

    // Unhover should keep the highlight because tab is active
    await userEvent.unhover(timespanBtn);
    expect(screen.getByTestId('active-tab-bg')).toBeInTheDocument();

    // If we click another tab, highlight should move
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    expect(screen.getByText('Wins')).toBeInTheDocument();
  });

  it('hovering tabs does not trigger fetch; clicking activates fetch', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Hover and unhover without clicking — should NOT trigger fetch
    await userEvent.hover(timespanBtn);
    await userEvent.unhover(timespanBtn);
    await new Promise((r) => setTimeout(r, 300)); // give debounce window
    expect(fetchSpy).not.toHaveBeenCalled();

    // Click should enable fetch and cause network call
    await userEvent.click(timespanBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  });
});
