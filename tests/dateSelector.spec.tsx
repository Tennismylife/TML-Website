/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateSelector from '../app/ranking/DateSelector';

describe('DateSelector component', () => {
  it('selects latest date of chosen year and calls onSelectDate once', async () => {
    const onSelect = vi.fn();
    const data = [
      { year: 2025, dates: [new Date('2025-12-21'), new Date('2025-12-14')] },
      { year: 2024, dates: [new Date('2024-08-10')] },
    ];

    render(<DateSelector data={data} onSelectDate={onSelect} />);

    // Initially should render years
    expect(screen.getByLabelText(/Year/i)).toBeTruthy();

    // Change year to 2024 -> should call onSelectDate with 2024-08-10
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2024' } });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
      const arg = onSelect.mock.calls[onSelect.mock.calls.length - 1][0];
      expect(arg.toISOString().slice(0,10)).toBe('2024-08-10');
    });
  });

  it('does not call onSelectDate when the candidate date is already selected', async () => {
    const onSelect = vi.fn();
    const selectedDate = new Date('2025-12-21');
    const data = [
      { year: 2025, dates: [new Date('2025-12-21'), new Date('2025-12-14')] },
    ];

    render(<DateSelector data={data} selectedDate={selectedDate} onSelectDate={onSelect} />);

    // No call should have been made because selectedDate equals latest
    expect(onSelect).not.toHaveBeenCalled();

    // Change year to the same year (no-op) - component should not call onSelectDate
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2025' } });

    await new Promise((r) => setTimeout(r, 50));
    expect(onSelect).not.toHaveBeenCalled();
  });
});