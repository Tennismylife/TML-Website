import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RecordsPageClient from "../RecordsClient";
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import RecordsWebPageJsonLd from '../RecordsWebPageJsonLd';

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
  // Use real DB name via prisma (works in SSR)
  const tournamentName = await getTournamentName(id);

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

import { redirect } from 'next/navigation';

export default async function RecordsCatchAllPage({
  params,
}: {
  params: Promise<{ id: string; segments?: string[] }>;
}) {
  const p = await params;
  const { id, segments } = p;

  // Redirect disallowed tournament-specific path /records/ages/winners to the parent ages page
  if (segments && segments.length >= 2 && segments[0] === 'ages' && segments[1] === 'winners') {
    const slugId = await getTournamentSlug(id);
    redirect(`/tournaments/${slugId}/records/ages`);
  }

  // Compute a server-side H1 for deeper record routes (percentage/overall, percentage/per-round, ages per-round overviews, etc.)
  let tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id);

  const humanTournament = humanize(tournamentName);

  let recordTitle = chooseRecordLabel(segments);
  // Special-cases to align with existing metadata phrasing
  if (segments && segments.length >= 1 && segments[0] === 'streak') {
    recordTitle = 'Longest Winning Streaks';
  }
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
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const normalizedSegments = Array.isArray(segments) ? segments.filter(Boolean) : [];
  const canonical = `${site}/tournaments/${slugId}/records${normalizedSegments.length ? `/${normalizedSegments.join('/')}` : ''}`;
  const pageTitle = (() => {
    if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'titles' && segments[2] === 'youngest') {
      return `Youngest Title Winners at ${tournamentName} | Tennis Records`;
    }
    if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'titles' && segments[2] === 'oldest') {
      return `Oldest Title Winners at ${tournamentName} | Tennis Records`;
    }
    if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'youngestrounds' && segments[2]) {
      return `Youngest Players in ${segments[2]} at ${tournamentName} | Tennis Records`;
    }
    if (segments && segments.length >= 3 && segments[0] === 'ages' && segments[1] === 'oldestrounds' && segments[2]) {
      return `Oldest Players in ${segments[2]} at ${tournamentName} | Tennis Records`;
    }
    if (segments && segments.length >= 2 && segments[0] === 'percentage' && segments[1] === 'overall') {
      return `${tournamentName} Percentage Records | Tennis Statistics`;
    }
    if (segments && segments.length >= 2 && segments[0] === 'percentage' && (segments[1] === 'per-round' || segments[1] === 'rounds')) {
      return `${tournamentName} Percentage Records by Round | Tennis Statistics`;
    }
    return `${humanTournament} | ${recordTitle}`;
  })();
  const pageDescription = (() => {
    if (segments && segments[0] === 'streak') return `Longest winning streak records for ${tournamentName} in the Open Era men's singles main draw.`;
    if (segments && segments[0] === 'least') return `Least games lost records for ${tournamentName}, including dominant runs to specific rounds and title matches.`;
    if (segments && segments[0] === 'rounds') return `Round-specific appearance records for ${tournamentName}, with player leaderboards for each stage of the draw.`;
    if (segments && segments[0] === 'ages') return `Age records for ${tournamentName}, covering youngest and oldest players, champions, and round achievers.`;
    if (segments && segments[0] === 'percentage') return `Winning percentage records for ${tournamentName}, including overall and round-by-round performance metrics.`;
    if (segments && segments[0] === 'timespan') return `Timespan records for ${tournamentName}, measuring long gaps between appearances, match wins, and titles.`;
    if (segments && segments[0] === 'rounds-on-entries') return `Rounds-on-entries records for ${tournamentName}, highlighting efficiency across tournament appearances.`;
    return `Tournament records and statistics for ${tournamentName}.`;
  })();
  const keywords = `${tournamentName}, tennis records, ${recordTitle}, ${normalizedSegments.join(' ')}`.trim();

  const showViewRecords = !(segments && segments[0] === 'percentage');

  const inferredTab = segments && segments.length ? String(segments[0]) : 'count';
  const initialActiveTab = inferredTab;
  const initialAgeSubTab = inferredTab === 'ages'
    ? (segments && segments[1] ? String(segments[1]) as any : 'main')
    : undefined;
  const initialPercentageSubTab = inferredTab === 'percentage'
    ? ((segments && segments[1] === 'per-round') || (segments && segments[1] === 'rounds') ? 'per-round' : 'overall')
    : undefined;

  return (
    <div>
      <main className={`w-full mx-auto ${showViewRecords ? 'pt-24 md:pt-32' : 'pt-16 md:pt-20'} py-8 px-0 text-white relative`} style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
          <RecordsWebPageJsonLd
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            canonical={canonical}
            keywords={keywords}
          />
          {showViewRecords && (
          <Link
            href={`/tournaments/${slugId}/records`}
            className="group relative inline-flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm md:text-base rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden absolute top-6 left-6 z-50"
            title="View Records of the Tournament"
            aria-label="View Records of the Tournament"
          >
            <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-2 transition-transform" />
            <span className="uppercase">VIEW RECORDS</span>
          </Link>
          )}

          <h1 className={`relative z-50 text-4xl md:text-5xl font-extrabold mb-6 text-center text-white${showViewRecords ? ' mt-8' : ''}`}>{`${humanTournament} | ${recordTitle}`}</h1>
          <RecordsPageClient
            params={idPromise}
            initialTournament={{ id, slug: slugId, name: tournamentName }}
            initialPathId={slugId}
            initialActiveTab={initialActiveTab}
            initialAgeSubTab={initialAgeSubTab}
            initialPercentageSubTab={initialPercentageSubTab}
          />
      </main>
    </div>
  );
}