export function recordTourLabel(label: string, tour: "ATP" | "WTA") {
  const text = label.replace(/\bsingles\b\s*/gi, "");
  if (tour === "ATP") return text;
  return text
    .replace(/^Most Career Wins\b/, "Most WTA Match Wins")
    .replace(/\bATP\b/g, "WTA")
    .replace(/\bMasters 1000\b/g, "WTA 1000")
    .replace(/\bDavis Cup\b/g, "Billie Jean King Cup");
}

const wtaHeadings = new Map([
  ["Most Matches Played", "Most WTA Matches Played"],
  ["Most WTA Titles", "Most WTA Tournament Titles"],
  ["Most Wins in WTA Finals", "Most WTA Finals Match Wins"],
  ["Most Appearances", "Most WTA Tournament Appearances"],
  ["Best Winning Percentage", "Highest WTA Match Winning Percentage"],
  ["Longest Winning Streak", "Longest WTA Match Winning Streak"],
  ["Most Played Head-to-Head", "Most Played WTA Head-to-Head Rivalries"],
]);

export function recordHeading(label: string, tour: "ATP" | "WTA") {
  const heading = recordTourLabel(label, tour);
  if (tour === "ATP" || !heading) return heading;
  const explicit = wtaHeadings.get(heading);
  if (explicit) return explicit;

  const specific = heading.replace(/\b(?<!Match )Wins\b/g, "Match Wins");
  if (/\bWTA\b/.test(specific)) return specific;
  const qualifier = /^(Most Played|Most|Fewest|Least|Best|Highest|Lowest|Longest|Shortest|Youngest|Oldest) /;
  return qualifier.test(specific)
    ? specific.replace(qualifier, "$1 WTA ")
    : `WTA ${specific}`;
}

export function recordBrowserTitle(heading: string, tour: "ATP" | "WTA") {
  return `${recordHeading(heading, tour)} | ${tour === "WTA" ? "WTA Records" : "Tennis Records"}`;
}
