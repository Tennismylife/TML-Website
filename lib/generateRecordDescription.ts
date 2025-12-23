export function generateRecordDescription(
  selectedRecord: string | null,
  activeSubTabs: Record<string, string>,
  selectedSurfaces: Set<string>,
  selectedLevels: Set<string>,
  selectedRounds: string,
  selectedBestOf: number | null,
  appliedParams?: Record<string, any>
): string {
  if (!selectedRecord) return '';

  const formatAppliedAge = (age?: number) => {
    if (age == null || !Number.isFinite(age)) return '(select age)';
    const years = Math.floor(age);
    const days = Math.round((age - years) * 365);
    return `${years}y ${days}d`;
  };

  const ord = (n?: number) => {
    if (!n || !Number.isFinite(n)) return 'nth';
    const v = Math.abs(n) % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  };

  const levelNames: Record<string, string> = {
    G: "Grand Slam",
    M: "Masters 1000",
    F: "ATP Finals",
    "500": "500",
    "250": "250",
    A: "Others",
    D: "Davis Cup",
  };

  const roundNames: Record<string, string> = {
    R128: "Round of 128",
    R64: "Round of 64",
    R32: "Round of 32",
    R16: "Round of 16",
    QF: "Quarterfinals",
    SF: "Semifinals",
    F: "Finals",
  };

  const roundAbbreviations: Record<string, string> = {
    R128: "R128s",
    R64: "R64s",
    R32: "R32s",
    R16: "R16s",
    QF: "QFs",
    SF: "SFs",
    F: "Fs",
  };

  const surfaceNames: Record<string, string> = {
    Hard: "Hard",
    Clay: "Clay",
    Grass: "Grass",
    Carpet: "Carpet",
  };

  const recordLabels: Record<string, string> = {
    wins: "wins",
    played: "matches played",
    count: "matches",
    titles: "titles",
    entries: "entries",
    ages: "ages",
    timespan: "timespan",
    percentage: "percentage",
    roundsonentries: "rounds on entries",
    same: "same tournament",
    seasons: "seasons",
    atage: "at age",
    ageofnth: "age at nth",
    neededto: "needed to",
    counterseasons: "counter seasons",
    h2h: "H2H",
    streak: "streak",
  };

  const subTabLabels: Record<string, Record<string, string>> = {
    ages: {
      oldest: "oldest main draw",
      youngest: "youngest main draw",
      oldestWinners: "oldest title winners",
      youngestWinners: "youngest title winners",
    },
    timespan: {
      entries: "entries",
      titles: "titles",
      rounds: "rounds",
    },
    roundsonentries: {
      titles: "titles",
      round: "round",
    },
    same: {
      wins: "wins",
      played: "matches played",
      entries: "entries",
      titles: "titles",
      round: "round",
    },
    seasons: {
      wins: "wins",
      played: "matches played",
      entries: "entries",
      titles: "titles",
      round: "round",
      percentage: "percentage",
    },
    atage: {
      wins: "wins",
      played: "matches played",
      entries: "entries",
      titles: "titles",
      slams: "slams",
      round: "round",
    },
    ageofnth: {
      wins: "win",
      played: "match",
      entries: "Entry",
      titles: "Title",
      round: "Round",
    },
    neededto: {
      titles: "titles",
    },
    counterseasons: {
      round: "round",
    },
    streak: {
      wins: "wins",
    },
    h2h: {
      count: "",
    },
  };

  let description = "";

  // Handle special cases first
  if (selectedRecord === 'ages') {
    const sub = activeSubTabs.ages;
    if (sub === 'oldest') {
      description = `Oldest player${selectedRounds ? '' : ' in main draw'}`;
    } else if (sub === 'youngest') {
      description = `Youngest player${selectedRounds ? '' : ' in main draw'}`;
    } else if (sub === 'oldestWinners') {
      description = `Oldest Title Winners`;
    } else if (sub === 'youngestWinners') {
      description = `Youngest Title Winners`;
    } else {
      description = `${subTabLabels.ages[sub] || sub}`;
    }
  } else if (selectedRecord === 'timespan') {
    const sub = activeSubTabs.timespan;
    const itemText = sub === 'rounds' && selectedRounds ? (roundAbbreviations[selectedRounds] || selectedRounds + 's') : subTabLabels.timespan[sub] || sub;
    description = `Biggest timespan between 2 ${itemText}`;
  } else if (selectedRecord === 'roundsonentries') {
    const sub = activeSubTabs.roundsonentries;
    if (sub === 'round' && selectedRounds) {
      description = `Most ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} on entries`;
    } else {
      description = `Most ${subTabLabels.roundsonentries[sub] || sub} on entries`;
    }
  } else if (selectedRecord === 'same') {
    const sub = activeSubTabs.same;
    if (sub === 'round' && selectedRounds) {
      description = `Most ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in same tournament`;
    } else {
      description = `Most ${subTabLabels.same[sub] || sub} in same tournament`;
    }
  } else if (selectedRecord === 'seasons') {
    const sub = activeSubTabs.seasons;
    if (sub === 'round' && selectedRounds) {
      description = `Most ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in same season`;
    } else if (sub === 'percentage') {
      description = `Best percentage in a season`;
    } else {
      description = `Most ${subTabLabels.seasons[sub] || sub} in same season`;
    }
  } else if (selectedRecord === 'atage') {
    const sub = activeSubTabs.atage;
    // When no age has been applied yet, instruct the user to select an age
    const appliedAge = appliedParams?.age;
    if (appliedAge != null && Number.isFinite(appliedAge)) {
      description = `Most ${subTabLabels.atage[sub] || sub} at ${formatAppliedAge(appliedAge)}`;
    } else {
      description = `Most ${subTabLabels.atage[sub] || sub} at (select age)`;
    }
  } else if (selectedRecord === 'ageofnth') {
    const sub = activeSubTabs.ageofnth;
    const appliedNth = appliedParams?.nth;
    if (sub === 'wins') {
      description = `Age of ${ord(appliedNth)} win`;
    } else {
      description = `Age of ${ord(appliedNth)} ${subTabLabels.ageofnth[sub] || sub}`;
    }
  } else if (selectedRecord === 'neededto') {
    const sub = activeSubTabs.neededto;
    if (sub === 'titles') {
      const n = appliedParams?.maxTitles ?? 'N';
      description = `Least tournaments played to win ${n} titles`;
    } else {
      description = `Least matches needed to win ${subTabLabels.neededto[sub] || sub}`;
    }
  } else if (selectedRecord === 'counterseasons') {
    const sub = activeSubTabs.counterseasons;
    // For the 'round' subtab, show a generic phrasing that includes the round abbreviation and an N placeholder
    if (sub === 'round') {
      const roundAbbr = selectedRounds ? (roundAbbreviations[selectedRounds] || selectedRounds) : 'rounds';
      if (selectedRounds) {
        description = `Seasons with at least N ${roundAbbr} (select a number)`;
      } else {
        description = `Seasons with at least N rounds (select a number)`;
      }
    } else if (sub === 'titles') {
      description = `Seasons with at least N Titles (select a number)`;
    } else {
      description = `Most consecutive seasons with at least one ${subTabLabels.counterseasons[sub] || sub}`;
    }
  } else if (selectedRecord === 'streak') {
    const sub = activeSubTabs.streak;
    if (sub === 'round') {
      const roundLabel = selectedRounds ? (roundAbbreviations[selectedRounds] || selectedRounds) : 'Rounds';
      if (selectedRounds) {
        description = `Longest Streaks of Consecutive ${roundLabel}`;
      } else {
        description = `Longest Streaks of Consecutive Rounds (select a round)`;
      }
    } else {
      description = `Longest winning ${subTabLabels.streak[sub] || sub} streak`;
    }
  } else if (selectedRecord === 'h2h') {
    const sub = activeSubTabs.h2h;
    const rawLabel = subTabLabels.h2h[sub];
    // If a mapping exists but is empty string, prefer empty (no label); only use the key when no mapping at all
    const label = rawLabel === undefined ? sub : rawLabel;
    description = label ? `Most H2Hs ${label}` : `Most H2Hs`;
  } else if (selectedRecord === 'percentage') {
    description = `Best percentage`;
  } else {
    // Default case
    description = `Most ${recordLabels[selectedRecord] || selectedRecord}`;
  }

  // Add filters
  const filters: string[] = [];

  if (selectedLevels.size > 0) {
    const levels = Array.from(selectedLevels).map(l => levelNames[l] || l);
    filters.push(`in ${levels.join(' or ')}`);
  }

  if (selectedSurfaces.size > 0) {
    const surfaces = Array.from(selectedSurfaces).map(s => surfaceNames[s] || s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }

  if (selectedRounds && !(selectedRecord === 'timespan' && activeSubTabs.timespan === 'rounds') && !(selectedRecord === 'roundsonentries' && activeSubTabs.roundsonentries === 'round') && !(selectedRecord === 'same' && activeSubTabs.same === 'round') && !(selectedRecord === 'seasons' && activeSubTabs.seasons === 'round') && !(selectedRecord === 'streak' && activeSubTabs.streak === 'round')) {
    filters.push(`in ${roundNames[selectedRounds] || selectedRounds}`);
  }

  if (selectedBestOf) {
    filters.push(`at Best of ${selectedBestOf}`);
  }

  if (filters.length > 0) {
    description += ' ' + filters.join(' ');
  }

  return description;
}