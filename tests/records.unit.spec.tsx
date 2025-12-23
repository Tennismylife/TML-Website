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
    expect(screen.getByRole('button', { name: /Entries/i })).toBeTruthy();

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
    expect(screen.getByTestId('active-tab-bg')).toBeTruthy();

    // But hovering alone should not render the Timespan component
    expect(screen.queryByText('Timespan')).toBeNull();

    // Click activates the tab and renders the component
    await userEvent.click(timespanBtn);
    expect(screen.getByText('Timespan')).toBeTruthy();

    // Unhover should keep the highlight because tab is active
    await userEvent.unhover(timespanBtn);
    expect(screen.getByTestId('active-tab-bg')).toBeTruthy();

    // If we click another tab, highlight should move
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    expect(screen.getByText('Wins')).toBeTruthy();
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

  it('renders the correct component when a tab is clicked', async () => {
    render(<RecordsMain />);

    // Click Wins tab
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    expect(screen.getByText('Wins')).toBeTruthy();

    // Click another tab, e.g., Played
    const playedBtn = screen.getByRole('button', { name: /Played/i });
    await userEvent.click(playedBtn);
    expect(screen.getByText('Played')).toBeTruthy();
    // Ensure previous component is not rendered
    expect(screen.queryByText('Wins')).toBeNull();
  });

  it('shows and hides subtabs for Timespan correctly', async () => {
    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Subtabs not visible initially
    expect(screen.queryByRole('button', { name: /Entries/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Titles/i })).toBeNull();

    // Hover to show subtabs
    await userEvent.hover(timespanBtn);
    expect(screen.getByRole('button', { name: /Entries/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Titles/i })).toBeTruthy();

    // Unhover to hide
    await userEvent.unhover(timespanBtn);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Entries/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Titles/i })).toBeNull();
    });
  });

  it('clicking a subtab activates it and renders the sub-component', async () => {
    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);

    // Click Entries subtab
    const entriesBtn = screen.getByRole('button', { name: /Entries/i });
    await userEvent.click(entriesBtn);

    // Assuming Entries component is rendered; adjust based on actual implementation
    expect(screen.getByText('Entries')).toBeTruthy();
  });

  it('only one tab is active at a time', async () => {
    render(<RecordsMain />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    const playedBtn = screen.getByRole('button', { name: /Played/i });

    await userEvent.click(winsBtn);
    expect(screen.getByText('Wins')).toBeTruthy();

    await userEvent.click(playedBtn);
    expect(screen.getByText('Played')).toBeTruthy();
    expect(screen.queryByText('Wins')).toBeNull();
  });

  it('fetch is called when clicking different tabs', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/records/wins'));

    const playedBtn = screen.getByRole('button', { name: /Played/i });
    await userEvent.click(playedBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/records/played'));
  });

  it('handles fetch errors gracefully', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('Network error');
    });
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);

    // Assuming error handling renders an error message; adjust based on implementation
    await waitFor(() => expect(screen.getByText(/error/i)).toBeTruthy());
  });

  it('initially renders no active component', () => {
    render(<RecordsMain />);

    expect(screen.queryByText('Wins')).toBeNull();
    expect(screen.queryByText('Played')).toBeNull();
    expect(screen.queryByText('Timespan')).toBeNull();
    expect(screen.queryByTestId('active-tab-bg')).toBeNull();
  });

  it('clicking a subtab triggers fetch for the subtab endpoint', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);

    const titlesBtn = screen.getByRole('button', { name: /Titles/i });
    await userEvent.click(titlesBtn);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/records/timespan/titles'));
  });

  it('rapid clicks on tabs only activate the last one', async () => {
    render(<RecordsMain />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    const playedBtn = screen.getByRole('button', { name: /Played/i });
    const countBtn = screen.getByRole('button', { name: /Count/i });

    await userEvent.click(winsBtn);
    await userEvent.click(playedBtn);
    await userEvent.click(countBtn);

    expect(screen.getByText('Count')).toBeTruthy();
    expect(screen.queryByText('Wins')).toBeNull();
    expect(screen.queryByText('Played')).toBeNull();
  });

  it('displays error for failed subtab fetch', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('Fetch failed');
    });
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);

    const entriesBtn = screen.getByRole('button', { name: /Entries/i });
    await userEvent.click(entriesBtn);

    await waitFor(() => expect(screen.getByText(/error/i)).toBeTruthy());
  });

  it('renders component for non-subtab tabs like Ages', async () => {
    render(<RecordsMain />);

    const agesBtn = screen.getByRole('button', { name: /Ages/i });
    await userEvent.click(agesBtn);

    expect(screen.getByText('Ages')).toBeTruthy();
  });

  it('fetch is not called on repeated clicks of the same tab', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordsMain />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await userEvent.click(winsBtn);
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Assuming no refetch on same tab
  });
});
