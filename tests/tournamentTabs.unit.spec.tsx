import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TournamentTabs from '../app/tournaments/[id]/records/TournamentTabs';

// Ensure React is available in the global scope for JSX runtime in the test environment
;(globalThis as any).React = React;

describe('TournamentTabs subtabs behavior', () => {
  let setActiveTab: any;
  let setActiveAgeSubTab: any;
  let setActivePercentageSubTab: any;

  beforeEach(() => {
    setActiveTab = vi.fn();
    setActiveAgeSubTab = vi.fn();
    setActivePercentageSubTab = vi.fn();
  });

  it('clicking Ages opens menu without forcing default subtab; clicking Titles triggers age subtab setter', async () => {
    render(
      <TournamentTabs
        activeTab="count"
        setActiveTab={setActiveTab}
        activeAgeSubTab="main"
        setActiveAgeSubTab={setActiveAgeSubTab}
        activePercentageSubTab="overall"
        setActivePercentageSubTab={setActivePercentageSubTab}
      />
    );

    const agesBtn = screen.getAllByRole('button').find(b => b.textContent?.trim() === 'Ages')!;
    await userEvent.click(agesBtn);

    // Clicking Ages should call setActiveTab('ages') and open the first subtab
    expect(setActiveTab).toHaveBeenCalledWith('ages');
    expect(setActiveAgeSubTab).toHaveBeenCalledWith('main');

    // Subtabs should be visible; find the 'Titles' subtab button and click it
    const titlesMatches = screen.getAllByRole('button', { name: /Titles/i });
    const titlesSub = titlesMatches.find(b => b.className?.includes('rounded-full')) || titlesMatches[0];
    await userEvent.click(titlesSub);

    expect(setActiveAgeSubTab).toHaveBeenCalledWith('titles');
  });

  it('clicking Percentages opens menu without forcing default subtab; clicking Win % per Round triggers percentage setter', async () => {
    render(
      <TournamentTabs
        activeTab="count"
        setActiveTab={setActiveTab}
        activeAgeSubTab="main"
        setActiveAgeSubTab={setActiveAgeSubTab}
        activePercentageSubTab="overall"
        setActivePercentageSubTab={setActivePercentageSubTab}
      />
    );

    const percBtn = screen.getAllByRole('button').find(b => b.textContent?.trim() === 'Percentages')!;
    await userEvent.click(percBtn);

    expect(setActiveTab).toHaveBeenCalledWith('percentage');
    expect(setActivePercentageSubTab).toHaveBeenCalledWith('overall');

    const perRoundMatches = screen.getAllByRole('button', { name: /Win % per Round/i });
    const perRoundBtn = perRoundMatches.find(b => b.className?.includes('rounded-full')) || perRoundMatches[0];
    await userEvent.click(perRoundBtn);

    expect(setActivePercentageSubTab).toHaveBeenCalledWith('per-round');
  });
});