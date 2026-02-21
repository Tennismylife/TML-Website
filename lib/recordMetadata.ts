export function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function makeTitle(recordLabel: string, tournamentName: string) {
  // For some record labels (superlatives, per-round headings, ages) we prefer the
  // form "{Label} at {Tournament} | Tennis Records" instead of "Most {Label} at the {Tournament} | Tennis Records".
  const specialPrefix = /^(Most|Youngest|Oldest|Best|Least|Average|Biggest|Youngest Title|Oldest Title)/i;
  if (specialPrefix.test(recordLabel)) {
    const title = `${recordLabel} at ${tournamentName} | Tennis Records`;
    return title;
  }

  const title = `Most ${recordLabel} at the ${tournamentName} | Tennis Records`;
  if (title.length <= 60) return title;
  // fallback: shorten the record label to first two words
  const shortLabel = recordLabel.split(' ').slice(0, 2).join(' ');
  return `Most ${shortLabel} at the ${tournamentName} | Tennis Records`;
}

export function makeLeastLabel(round?: string) {
  if (!round) return 'Least Records';
  if (String(round) === 'W') return 'Least games lost to win title';
  return `Least games lost to reach ${String(round)}`;
}
