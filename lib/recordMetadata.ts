import { fetchTournamentHeaderCached } from './tournamentHeaderCache';

function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') {
    // Reject purely numeric strings (e.g. a DB id stored as name)
    if (/^\d+$/.test(nameField.trim())) return '';
    return nameField;
  }
  // Numbers are never valid names (they're likely DB IDs stored in the wrong field)
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return '';
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}

export function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getTournamentName(id: string) {
  // default to a humanized version of the id (handles slugs like 'australian-open')
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = extractName(header?.name);
    if (raw) tournamentName = humanize(raw);
  } catch (e) {
    // ignore and keep humanized id as fallback
  }
  return tournamentName;
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
