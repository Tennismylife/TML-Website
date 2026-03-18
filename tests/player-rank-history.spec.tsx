/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import RankHistory from '../app/players/[id]/Ranking/RankHistory';

describe('RankHistory component', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.fn(async (url: string) => {
      if (url.includes('/api/players/rankings')) {
        return {
          ok: true,
          json: async () => ({ rankings: [
            { date: '2024-12-31', rank: 10, points: 900 },
            { date: '2025-01-01', rank: 5, points: 1234 },
            { date: '2025-02-01', rank: 4, points: 1300 }
          ] }),
        } as any;
      }
      return { ok: false } as any;
    });
    global.fetch = fetchSpy as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state then table rows and respects year selector', async () => {
    render(<RankHistory playerId="p1" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    await waitFor(() => { expect(fetchSpy).toHaveBeenCalled(); });
    expect(await screen.findByText('Rank')).toBeInTheDocument();

    // dropdown should exist with three options (All + two years) for table selector
    const select = screen.getByLabelText(/Year/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(3);
    expect(select.value).toBe('2025');

    // table should show only 2025 rows initially
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();

    // change year to 2024
    select.value = '2024';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    expect(screen.queryByText('5')).not.toBeInTheDocument();

    // change year to 2024
    select.value = '2024';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    expect(screen.queryByText('5')).not.toBeInTheDocument();

    // verify y-axis uses log scale
    const yaxis = screen.getByTestId('yaxis');
    expect(yaxis).toHaveAttribute('scale', 'log');

    // checkbox should be present and toggles independently of table
    const checkbox = screen.getByLabelText(/End‑of‑year only/i) as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    checkbox.click();
    expect(checkbox.checked).toBe(true);
    // table data unaffected by checkbox
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows empty state when API returns no data', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ rankings: [] }) } as any);
    render(<RankHistory playerId="p1" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.getByText(/No ranking history available/i)).toBeInTheDocument();
  });

  it('tooltip component renders date, rank and points', () => {
    // import the exported tooltip helper directly
    const { RankHistoryTooltip } = require('../app/players/[id]/RankHistory');
    const { container } = render(
      <RankHistoryTooltip
        active={true}
        payload={[{ payload: { label: '1/1/2025', rank: 5, points: 1234 } }]}
        label="1/1/2025"
      />
    );
    expect(container).toHaveTextContent('1/1/2025');
    expect(container).toHaveTextContent('Rank: 5');
    expect(container).toHaveTextContent('Points: 1234');
  });
});
