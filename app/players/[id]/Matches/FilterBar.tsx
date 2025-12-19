"use client";

import React, { useState, useEffect } from "react";

const TOURNEY_LEVELS = [
  { code: "G", label: "Grand Slam" },
  { code: "M", label: "Masters 1000" },
  { code: "A", label: "Others" },
  { code: "F", label: "Finals" },
  { code: "D", label: "Davis Cup" },
  { code: "O", label: "Olympics" },
];

interface FilterNode {
  label: string;
  value?: string;
  setter?: (val: string) => void;
}

interface CategoryNode {
  label: string;
  children: FilterNode[];
  selectedValue: string;
}

interface FilterBarProps {
  years: string[];
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  tourneyLevels: string[];
  tourneyLevelLabels?: Record<string,string>;
  selectedLevel: string;
  setSelectedLevel: (val: string) => void;
  tourneyIds: string[];
  tourneyNames: string[];
  selectedTourneyId: string;
  setSelectedTourneyId: (val: string) => void;
  surfaces: string[];
  selectedSurface: string;
  setSelectedSurface: (val: string) => void;
  rounds: string[];
  selectedRound: string;
  setSelectedRound: (val: string) => void;
  resultFilter: string;
  setResultFilter: (val: string) => void;
  vsRankFilter: string;
  setVsRankFilter: (val: string) => void;
  vsAgeFilter: string;
  setVsAgeFilter: (val: string) => void;
  vsHandFilter: string;
  setVsHandFilter: (val: string) => void;
  vsBackhandFilter: string;
  setVsBackhandFilter: (val: string) => void;
  vsEntryFilter: string;
  setVsEntryFilter: (val: string) => void;
  asRankFilter: string;
  setAsRankFilter: (val: string) => void;
  asEntryFilter: string;
  setAsEntryFilter: (val: string) => void;
  setFilter: string;
  setSetFilter: (val: string) => void;
  firstSetFilter: string;
  setFirstSetFilter: (val: string) => void;
  scoreFilter: string;
  setScoreFilter: (val: string) => void;
  onExplicitChange?: (key: string, value: string) => void;
}

function Category({ category, onExplicitChange }: { category: CategoryNode, onExplicitChange?: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(false);
  const hasSelected = category.selectedValue !== "All";

  useEffect(() => {
    if (hasSelected) setOpen(true);
  }, [hasSelected]);

  return (
    <div>
      <div
        className={`flex items-center cursor-pointer select-none p-0 transition-all ${
          hasSelected
            ? "bg-yellow-600/20 border-l-4 border-yellow-400 font-bold"
            : "bg-transparent border-l-4 border-transparent font-semibold"
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs mr-2 leading-none" aria-hidden>{open ? "▼" : "▶"}</span>
        <span className="ml-0">{category.label}</span>
      </div>

      {open && (
        <div className="ml-0 space-y-1">
          {category.children.map(filter => (
            <label
              key={`${category.label}-${filter.label}-${filter.value}`}
              className={`flex items-center cursor-pointer text-white py-1 ${
                category.selectedValue === filter.value ? "font-bold text-yellow-400" : ""
              }`}
            >
              <input
                type="radio"
                name={category.label}
                value={filter.value}
                checked={category.selectedValue === filter.value}
                onChange={() => {
                  const labelToKey: Record<string,string> = {
                    Season: 'year',
                    Tourney: 'tourney',
                    Level: 'level',
                    Surface: 'surface',
                    Round: 'round',
                    Result: 'result',
                    'vs Rank': 'vsRank',
                    'vs Age': 'vsAge',
                    'vs Hand': 'vsHand',
                    'vs Backhand': 'vsBackhand',
                    'vs Entry': 'vsEntry',
                    'Player Rank': 'asRank',
                    'Player Entry': 'asEntry',
                    'Sets': 'set',
                    'First Sets': 'firstSet',
                    'Score': 'score'
                  };
                  const key = labelToKey[category.label] || category.label.toLowerCase().replace(/\s+/g, '');
                  const explicitValue = filter.value === 'All' ? '' : filter.value!;
                  console.debug('[FilterBar] onChange', { category: category.label, key, filterValue: filter.value, explicitValue });
                  onExplicitChange?.(key, explicitValue);
                  // then update local selection
                  filter.setter?.(filter.value!);
                  console.debug('[FilterBar] setter called for', { category: category.label, newValue: filter.value });
                }}
                className="mr-2"
              />
              <span>{filter.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar(props: FilterBarProps) {
  const {
    years, selectedYear, setSelectedYear,
    tourneyLevels, selectedLevel, setSelectedLevel,
    tourneyIds, tourneyNames, selectedTourneyId, setSelectedTourneyId,
    surfaces, selectedSurface, setSelectedSurface,
    rounds, selectedRound, setSelectedRound,
    resultFilter, setResultFilter,
    vsRankFilter, setVsRankFilter,
    vsAgeFilter, setVsAgeFilter,
    vsHandFilter, setVsHandFilter,
    vsBackhandFilter, setVsBackhandFilter,
    vsEntryFilter, setVsEntryFilter,
    asRankFilter, setAsRankFilter,
    asEntryFilter, setAsEntryFilter,
    setFilter, setSetFilter,
    firstSetFilter, setFirstSetFilter,
    scoreFilter, setScoreFilter,
  } = props;

  const createChildren = (options: string[], setter: (val: string) => void) => [
    { label: "All", value: "All", setter },
    ...options.map(v => ({ label: v, value: v, setter }))
  ];

  const tourneyChildren: FilterNode[] = [
    { label: "All", value: "All", setter: setSelectedTourneyId },
    ...tourneyIds.map((id, idx) => ({
      label: tourneyNames[idx] || id,
      value: id,
      setter: setSelectedTourneyId
    }))
  ];

  const levelChildren: FilterNode[] = [
    { label: "All", value: "All", setter: setSelectedLevel },
    ...TOURNEY_LEVELS.map(l => ({
      label: l.label,
      value: l.code,
      setter: setSelectedLevel
    }))
  ];

  const categories: CategoryNode[] = [
    { label: "Season", children: createChildren(years, setSelectedYear), selectedValue: selectedYear },
    { label: "Tourney", children: tourneyChildren, selectedValue: selectedTourneyId },
    { label: "Level", children: levelChildren, selectedValue: selectedLevel },
    { label: "Surface", children: createChildren(surfaces, setSelectedSurface), selectedValue: selectedSurface },
    { label: "Round", children: createChildren(rounds, setSelectedRound), selectedValue: selectedRound },
    { label: "Result", children: createChildren(["Win","Loss","W by RET","L by RET","W by W/O","L by W/O"], setResultFilter), selectedValue: resultFilter },
    { label: "vs Rank", children: createChildren(["Top1","Top5","Top10","Top20","Top50","Top100","11+","21+","51+","101+","Higher","Lower"], setVsRankFilter), selectedValue: vsRankFilter },
    { label: "vs Age", children: createChildren(["Younger","Older","Under18","Under21","Under23","Over28","Over30","Over40"], setVsAgeFilter), selectedValue: vsAgeFilter },
    { label: "vs Hand", children: createChildren(["Right","Left"], setVsHandFilter), selectedValue: vsHandFilter },
    { label: "vs Backhand", children: createChildren(["One-handed","Two-handed"], setVsBackhandFilter), selectedValue: vsBackhandFilter },
    { label: "vs Entry", children: createChildren(["Seeded","Unseeded","Qualifier","WC","Lucky Loser","Protected Ranking","Special Exempt"], setVsEntryFilter), selectedValue: vsEntryFilter },
    { label: "Player Rank", children: createChildren(["Top1","Top5","Top10","Top20","Top50","Top100","11+","21+","51+","101+","Higher","Lower"], setAsRankFilter), selectedValue: asRankFilter },
    { label: "Player Entry", children: createChildren(["Seeded","Unseeded","Qualifier","WC","Lucky Loser","Protected Ranking","Special Exempt"], setAsEntryFilter), selectedValue: asEntryFilter },
    { label: "Sets", children: createChildren(["Straights","Deciders","All Best of 5","3 Sets (of 5)","4-Setters","5-Setters","All Best of 3","2-Setters","3 Sets (of 3)"], setSetFilter), selectedValue: setFilter },
    { label: "First Sets", children: createChildren(["Won 1st Set","Lost 1st Set","Won Sets 1&2","Lost Sets 1&2","Split 1&2","Up 2-1 Sets","Down 1-2 Sets"], setFirstSetFilter), selectedValue: firstSetFilter },
    { label: "Score", children: createChildren(["All tiebreaks","TB won","TB lost","Deciding TB","All 7-5","7-5 won","7-5 lost","All bagels","6-0 won","6-0 lost","All 6-1","6-1 won","6-1 lost"], setScoreFilter), selectedValue: scoreFilter },
  ];

  return (
    <div className="p-0 pr-0 bg-transparent w-full text-sm space-y-2">
      {categories.map(cat => <Category key={cat.label} category={cat} onExplicitChange={props.onExplicitChange} />)}
    </div>
  );
}