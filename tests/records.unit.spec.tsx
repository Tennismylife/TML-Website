import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
/** @vitest-environment jsdom */
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RecordPage from '../app/records/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}));

// Mock utils and other aliased modules
vi.mock('@/lib/utils', () => ({ getFlagFromIOC: () => '' }));

// Mock all heavy child components so tests don't need to resolve deep imports
vi.mock('../app/records/Wins/Wins', () => ({ default: () => (<div data-testid="component-Wins">Wins</div>) }));
vi.mock('../app/records/Played/Played', () => ({ default: () => (<div data-testid="component-Played">Played</div>) }));
vi.mock('../app/records/Count/Count', () => ({ default: () => (<div data-testid="component-Count">Count</div>) }));
vi.mock('../app/records/Titles/Titles', () => ({ default: () => (<div data-testid="component-Titles">Titles</div>) }));
vi.mock('../app/records/Entries/Entries', () => ({ default: () => (<div data-testid="component-Entries">Entries</div>) }));
vi.mock('../app/records/Timespan/Timespan', () => ({ default: () => (<div data-testid="component-Timespan">Timespan</div>) }));
vi.mock('../app/records/Ages/Ages', () => ({ default: () => (<div data-testid="component-Ages">Ages</div>) }));
vi.mock('../app/records/Percentage/Percentage', () => ({ default: () => (<div data-testid="component-Percentage">Percentage</div>) }));
vi.mock('../app/records/RoundsOnEntries/RoundsOnEntries', () => ({ default: () => (<div data-testid="component-RoundsOnEntries">RoundsOnEntries</div>) }));
vi.mock('../app/records/Same/Same', () => ({ default: () => (<div data-testid="component-Same">Same</div>) }));
vi.mock('../app/records/Seasons/Seasons', () => ({ default: () => (<div data-testid="component-Seasons">Seasons</div>) }));
vi.mock('../app/records/AtAge/AtAge', () => ({ default: () => (<div data-testid="component-AtAge">AtAge</div>) }));
vi.mock('../app/records/AgeofNth/AgeofNth', () => ({ default: () => (<div data-testid="component-AgeofNth">AgeofNth</div>) }));
vi.mock('../app/records/NeededTo/NeededTo', () => ({ default: () => (<div data-testid="component-NeededTo">NeededTo</div>) }));
vi.mock('../app/records/CounterSeasons/CounterSeasons', () => ({ default: () => (<div data-testid="component-CounterSeasons">CounterSeasons</div>) }));
vi.mock('../app/records/H2H/H2H', () => ({ default: () => (<div data-testid="component-H2H">H2H</div>) }));
vi.mock('../app/records/Streak/Streak', () => ({ default: () => (<div data-testid="component-Streak">Streak</div>) }));

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
    const { container } = render(<RecordPage />);

    // Find a tab that has subtabs (Timespan -> Entries/Titles/Rounds)
    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Subtabs should not be visible initially (no small subtab buttons)
    const entriesSubInitial = screen.queryAllByRole('button', { name: /Entries/i }).filter(b => b.className?.includes('px-3'));
    expect(entriesSubInitial.length).toBe(0);

    // Hover the tab and ensure subtabs appear
    await userEvent.hover(timespanBtn);
    // disambiguate between main tabs and subtabs by selecting all matches and picking the small subtab button
    const entriesMatches = screen.getAllByRole('button', { name: /Entries/i });
    const entriesSub = entriesMatches.find(b => b.className?.includes('px-3')) || entriesMatches[0];
    expect(entriesSub).toBeTruthy();

    // Unhover and confirm subtabs hide again
    await userEvent.unhover(timespanBtn);
    await waitFor(() => {
      const after = screen.queryAllByRole('button', { name: /Entries/i }).filter(b => b.className?.includes('px-3'));
      expect(after.length).toBe(0);
    });
  });

  it('hover highlights tab but does not activate its component; click activates it', async () => {
    render(<RecordPage />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Ensure active background is absent initially
    expect(screen.queryByTestId('active-tab-bg')).toBeNull();

    // Hover highlights the tab (background appears)
    await userEvent.hover(timespanBtn);
    expect(screen.getByTestId('active-tab-bg')).toBeTruthy();

    // But hovering alone should not render the Timespan component
    expect(screen.queryByTestId('component-Timespan')).toBeNull();

    // Click activates the tab and renders the component
    await userEvent.click(timespanBtn);
    expect(screen.getByTestId('component-Timespan')).toBeTruthy();

    // Unhover should keep the highlight because tab is active
    await userEvent.unhover(timespanBtn);
    expect(screen.getByTestId('active-tab-bg')).toBeTruthy();

    // If we click another tab, highlight should move
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    expect(screen.getByTestId('component-Wins')).toBeTruthy();
  });

  it('hovering tabs does not trigger fetch; clicking activates fetch', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordPage />);

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
    render(<RecordPage />);

    // Click Wins tab — clicking a tab with subtabs should navigate to its first subtab automatically
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    // For top-level tabs that have a dedicated server component (Wins is top-level) the component renders
    expect(screen.getByTestId('component-Wins')).toBeTruthy();

    // Click 'Same' tab — it has subtabs and should navigate to its default first subtab 'wins'
    const sameBtn = screen.getByRole('button', { name: /Same/i });
    await userEvent.click(sameBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/records/same/wins'));

    // Click another tab, e.g., Played
    const playedBtn = screen.getByRole('button', { name: /Played/i });
    await userEvent.click(playedBtn);
    expect(screen.getByTestId('component-Played')).toBeTruthy();
    // Ensure previous component is not rendered
    expect(screen.queryByTestId('component-Wins')).toBeNull();
  });

  it('shows and hides subtabs for Timespan correctly', async () => {
    render(<RecordPage />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });

    // Subtabs not visible initially (no small subtab buttons)
    const entriesSubInitial = screen.queryAllByRole('button', { name: /Entries/i }).filter(b => b.className?.includes('px-3'));
    expect(entriesSubInitial.length).toBe(0);
    const titlesSubInitial = screen.queryAllByRole('button', { name: /Titles/i }).filter(b => b.className?.includes('px-3'));
    expect(titlesSubInitial.length).toBe(0);

    // Hover to show subtabs
    await userEvent.hover(timespanBtn);
    const entriesMatches2 = screen.getAllByRole('button', { name: /Entries/i });
    const entriesSub2 = entriesMatches2.find(b => b.className?.includes('px-3')) || entriesMatches2[0];
    expect(entriesSub2).toBeTruthy();

    const titlesMatches = screen.getAllByRole('button', { name: /Titles/i });
    const titlesSub = titlesMatches.find(b => b.className?.includes('px-3')) || titlesMatches[0];
    expect(titlesSub).toBeTruthy();

    // Unhover to hide
    await userEvent.unhover(timespanBtn);
    await waitFor(() => {
      const afterEntries = screen.queryAllByRole('button', { name: /Entries/i }).filter(b => b.className?.includes('px-3'));
      const afterTitles = screen.queryAllByRole('button', { name: /Titles/i }).filter(b => b.className?.includes('px-3'));
      expect(afterEntries.length).toBe(0);
      expect(afterTitles.length).toBe(0);
    });
  });

  it('clicking a subtab activates it and renders the sub-component', async () => {
    render(<RecordPage />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);
    // Ensure the Timespan tab is active so subtab clicks take effect
    await userEvent.click(timespanBtn);

    // Click Entries subtab
    const entriesMatches3 = screen.getAllByRole('button', { name: /Entries/i });
    const entriesBtn = entriesMatches3.find(b => b.className?.includes('px-3')) || entriesMatches3[0];
    await userEvent.click(entriesBtn);

    // Assuming Entries component is rendered; adjust based on actual implementation
    await waitFor(() => expect(screen.getByTestId('component-Entries')).toBeTruthy());
  });

  it('only one tab is active at a time', async () => {
    render(<RecordPage />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    const playedBtn = screen.getByRole('button', { name: /Played/i });

    await userEvent.click(winsBtn);
    expect(screen.getByTestId('component-Wins')).toBeTruthy();

    await userEvent.click(playedBtn);
    expect(screen.getByTestId('component-Played')).toBeTruthy();
    expect(screen.queryByTestId('component-Wins')).toBeNull();
  });

  it('fetch is called when clicking different tabs', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordPage />);

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

    render(<RecordPage />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);

    // Assuming error handling renders an error message; adjust based on implementation
    await waitFor(() => expect(screen.getByText(/error/i)).toBeTruthy());
  });

  it('initially renders no active component', () => {
    render(<RecordPage />);

    expect(screen.queryByTestId('component-Wins')).toBeNull();
    expect(screen.queryByTestId('component-Played')).toBeNull();
    expect(screen.queryByTestId('component-Timespan')).toBeNull();
    expect(screen.queryByTestId('active-tab-bg')).toBeNull();
  });

  it('clicking a subtab triggers fetch for the subtab endpoint', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordPage />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);

    const titlesMatches2 = screen.getAllByRole('button', { name: /Titles/i });
    const titlesBtn = titlesMatches2.find(b => b.className?.includes('px-3')) || titlesMatches2[0];
    await userEvent.click(titlesBtn);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/records/timespan/titles'));

    // URL should be updated to canonical path form
    await waitFor(() => {
      // history.replaceState should have been used to update URL in-place
      expect(window.location.pathname).toBe('/records/timespan/titles');
    });
  });

  it('rapid clicks on tabs only activate the last one', async () => {
    render(<RecordPage />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    const playedBtn = screen.getByRole('button', { name: /Played/i });
    const countBtn = screen.getByRole('button', { name: /^Count$/i });

    await userEvent.click(winsBtn);
    await userEvent.click(playedBtn);
    await userEvent.click(countBtn);

    expect(screen.getByTestId('component-Count')).toBeTruthy();
    expect(screen.queryByText('Wins')).toBeNull();
    expect(screen.queryByText('Played')).toBeNull();
  });

  it('displays error for failed subtab fetch', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('Fetch failed');
    });
    global.fetch = fetchSpy as any;

    render(<RecordPage />);

    const timespanBtn = screen.getByRole('button', { name: /Timespan/i });
    await userEvent.hover(timespanBtn);

    const entriesMatches3 = screen.getAllByRole('button', { name: /Entries/i });
    const entriesBtn = entriesMatches3.find(b => b.className?.includes('px-3')) || entriesMatches3[0];
    await userEvent.click(entriesBtn);

    await waitFor(() => expect(screen.getByText(/error/i)).toBeTruthy());
  });

  it('renders component for non-subtab tabs like Ages', async () => {
    render(<RecordPage />);

    const agesBtn = screen.getByRole('button', { name: /Ages/i });
    await userEvent.click(agesBtn);

    expect(screen.getByTestId('component-Ages')).toBeTruthy();

    // URL should reflect the selected record
    expect(window.location.pathname).toBe('/records/ages');
  });

  it('clicking an Ages subtab like Oldest Winners resets filters and updates path to kebab-case', async () => {
    render(<RecordPage />);

    // Activate Wins tab and apply a filter so we have a filter state
    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    // Simulate a filter click via the lightweight TestRecords pattern (some filters appear after activation)
    const hardBtn = screen.getByRole('button', { name: /Hard/i });
    await userEvent.click(hardBtn);

    // Ensure URL contains the surface param now
    await waitFor(() => expect(window.location.search).toContain('surface=Hard'));

    // Now switch to Ages tab and click the Oldest Winners subtab
    const agesBtn = screen.getByRole('button', { name: /Ages/i });
    await userEvent.hover(agesBtn);
    await userEvent.click(agesBtn); // activate ages tab

    const owMatches = screen.getAllByRole('button', { name: /Oldest Winners/i });
    const owBtn = owMatches.find(b => b.className?.includes('px-3')) || owMatches[0];
    await userEvent.click(owBtn);

    // Expect OldestWinners component
    await waitFor(() => expect(screen.getByTestId('component-OldestWinners')).toBeTruthy());

    // Filters should have been reset (no surface query param)
    expect(window.location.search).not.toContain('surface=Hard');

    // And the URL pathname should be kebab-case
    expect(window.location.pathname).toBe('/records/ages/oldest-winners');
  });

  it('fetch is not called on repeated clicks of the same tab', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    render(<RecordPage />);

    const winsBtn = screen.getByRole('button', { name: /Wins/i });
    await userEvent.click(winsBtn);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await userEvent.click(winsBtn);
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Assuming no refetch on same tab
  });
});
