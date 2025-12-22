import { render, screen } from '@testing-library/react';
/** @vitest-environment jsdom */
import React from 'react';
import { vi, describe, it, expect } from 'vitest';

// Mock child components
vi.mock('../app/records/RoundsOnEntries/Titles', () => ({ default: () => (<div>TitlesMock</div>) }));
vi.mock('../app/records/RoundsOnEntries/Rounds', () => ({ default: () => (<div>RoundsMock</div>) }));

import Roundsonentries from '../app/records/RoundsOnEntries/RoundsOnEntries';

describe('Roundsonentries', () => {
  it('initializes minimum entries at 1 and displays label', () => {
    render(<Roundsonentries selectedSurfaces={new Set()} selectedLevels={new Set()} selectedRounds={''} activeSubTab={'titles'} />);

    expect(screen.getByText(/Minimum Entries:/i)).toBeTruthy();
    expect(screen.getByText(/Minimum Entries: 1/i)).toBeTruthy();
  });
});
