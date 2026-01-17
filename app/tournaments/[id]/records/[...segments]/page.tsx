import React from 'react';
import RecordsPage from "../page";
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
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

function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function chooseRecordLabel(segments: string[] | undefined) {
  const tab = (segments && segments[0]) ? String(segments[0]) : 'count';
  const sub = (segments && segments[1]) ? String(segments[1]) : null;

  if (tab === 'count') {
    switch (sub) {
      case 'titles': return 'Titles';
      case 'played': return 'Matches Played';
      case 'entries': return 'Entries';
      case 'wins': return 'Wins';
      default: return 'Wins';
    }
  }

  if (tab === 'percentage') {
    if (sub === 'rounds' || sub === 'per-round') return 'Win Percentage Per Round';
    return 'Win Percentage';
  }

  if (tab === 'ages') {
    if (sub === 'titles') return 'Titles (Ages)';
    if (sub === 'youngestrounds') return 'Youngest per Round';
    if (sub === 'oldestrounds') return 'Oldest per Round';
    return 'Ages';
  }

  if (tab === 'rounds') return 'Rounds Reached';
  if (tab === 'timespan') return 'Timespan Between Appearances';
  if (tab === 'rounds-on-entries') return 'Rounds per Entry';
  if (tab === 'least') return 'Least Records';
  if (tab === 'average-age') return 'Average Age';

  // fallback
  return humanize(tab || 'Records');
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; segments?: string[] }> }) {
  const p = await params;
  const { id, segments } = p;
  // Humanize the param by default (e.g., 'australian-open' -> 'Australian Open')
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = extractName(header?.name);
    if (raw) tournamentName = humanize(raw);
  } catch (e) {
    // ignore and use humanized id as fallback
  }

  // Special-case: when path is /records/count (no inner section), use the site-specific title required.
  if (segments && segments.length === 1 && segments[0] === 'count') {
    return { title: `${tournamentName} Open Era Records | Tennis My Life` };
  }

  // Special-case: when path is /records/percentage/overall return a specific title
  if (segments && segments.length >= 2 && segments[0] === 'percentage' && segments[1] === 'overall') {
    return { title: `${tournamentName} Percentage Records | Tennis Statistics` };
  }

  // Special-case: when path is /records/percentage/per-round or /records/percentage/rounds
  if (segments && segments.length >= 2 && segments[0] === 'percentage' && (segments[1] === 'per-round' || segments[1] === 'rounds')) {
    return { title: `${tournamentName} Percentage Records by Round | Tennis Statistics` };
  }

  // Special-case: when path is /records/timespan (root), return the site-specific Timespan title
  if (segments && segments.length === 1 && segments[0] === 'timespan') {
    return { title: `${tournamentName} Timespan Records | Tennis My Life` };
  }

  // Special-case: ages titles youngest specific phrase
  if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'titles' && segments[2] === 'youngest') {
    return { title: `Youngest Title Winners at ${tournamentName} | Tennis Records` };
  }

  // Special-case: ages titles oldest specific phrase
  if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'titles' && segments[2] === 'oldest') {
    return { title: `Oldest Title Winners at ${tournamentName} | Tennis Records` };
  }

  // Special-case: ages youngest per-round deep path, e.g., /records/ages/youngestrounds/F
  if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'youngestrounds' && segments[2]) {
    const round = String(segments[2]);
    return { title: `Youngest Players in ${round} at ${tournamentName} | Tennis Records` };
  }

  // Special-case: ages oldest per-round deep path
  if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'oldestrounds' && segments[2]) {
    const round = String(segments[2]);
    return { title: `Oldest Players in ${round} at ${tournamentName} | Tennis Records` };
  }

  const recordLabel = chooseRecordLabel(segments);
  const title = `Most ${recordLabel} at the ${tournamentName} | Tennis Records`;

  // keep titles reasonably short - if over 60 chars, fall back to a shorter form
  if (title.length > 60) {
    const shortLabel = recordLabel.split(' ').slice(0,2).join(' ');
    return { title: `Most ${shortLabel} at the ${tournamentName} | Tennis Records` };
  }

  return { title };
}

export default async function RecordsCatchAllPage({
  params,
}: {
  params: Promise<{ id: string; segments?: string[] }>;
}) {
  const p = await params;
  const { id, segments } = p;

  // Compute a server-side H1 for deeper record routes (percentage/overall, percentage/per-round, ages per-round overviews, etc.)
  let tournamentName = String(id || '').replace(/-/g, ' ');
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = header && header.name ? (Array.isArray(header.name) ? header.name.at(-1) : header.name) : null;
    if (raw) tournamentName = extractName(raw) || tournamentName;
  } catch (e) {
    // ignore and use humanized id
  }

  const humanTournament = humanize(tournamentName);

  let recordTitle = chooseRecordLabel(segments);
  // Special-cases to align with existing metadata phrasing
  if (segments && segments.length >= 2 && segments[0] === 'percentage' && segments[1] === 'overall') {
    recordTitle = 'Percentage Records';
  }
  if (segments && segments.length >= 2 && segments[0] === 'percentage' && (segments[1] === 'per-round' || segments[1] === 'rounds')) {
    recordTitle = 'Percentage Records by Round';
  }
  if (segments && segments.length >= 2 && segments[0] === 'ages' && segments[1] === 'youngestrounds') {
    recordTitle = 'Youngest per Round';
  }
  if (segments && segments.length >= 2 && segments[0] === 'ages' && segments[1] === 'oldestrounds') {
    recordTitle = 'Oldest per Round';
  }

  const idPromise = Promise.resolve({ id });

  return (
    <div>
      <main className="w-full mx-auto py-8 px-0 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-center">{`${humanTournament} | ${recordTitle}`}</h1>
          <RecordsPage params={idPromise} />
      </main>
    </div>
  );
}