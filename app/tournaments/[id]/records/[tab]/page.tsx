import React from 'react';
import RecordsPageClient from "../RecordsClient";
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import type { Metadata } from 'next';
import RecordsWebPageJsonLd from '../RecordsWebPageJsonLd';

function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id: param, tab } = await params;

  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
  // Use real DB name (works in SSR via prisma)
  const displayFromParam = await getTournamentName(String(param ?? ''));

  const tabLabels: Record<string, string> = {
    count: 'Counts',
    rounds: 'Rounds',
    ages: 'Ages',
    percentage: 'Percentages',
    timespan: 'Timespans',
    'rounds-on-entries': 'Rounds on Entries',
    'roundsonentries': 'Rounds on Entries',
    least: 'Least',
    'average-age': 'Average Age',
  };

  const typeLabelFromParam = tab ? (tabLabels[tab] ?? humanizeName(tab || 'Records')) : 'Records';
  const titleFromParam = tab ? `${displayFromParam} | ${typeLabelFromParam}` : `${displayFromParam} Records`;
  // Use /count for count tab root canonical
  const ogUrlFromParam = tab === 'count' ? `${site}/tournaments/${param}/records/count` : tab === 'ages' ? `${site}/tournaments/${param}/records/ages` : `${site}/tournaments/${param}/records${tab ? `/${tab}` : ''}`;
  // Simpler: always use the static CTA image for records previews
  const ogImageFromParam = `${site}/og/site-preview.png`;

  // Special-case: when viewing the 'rounds' tab root, return the requested title
  if (tab === 'rounds') {
    const siteTitle = `${displayFromParam} Records by Round | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Rounds`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'count' tab root, return the site-specific SEO title
  if (tab === 'count') {
    const siteTitle = `${displayFromParam} Open Era Records | Tennis My Life`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Counts`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'rounds-on-entries' or 'roundsonentries' tab root, return the canonical "Rounds on Entries" title
  if (tab === 'rounds-on-entries' || tab === 'roundsonentries') {
    const siteTitle = `${displayFromParam} Rounds on Entries | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Rounds on Entries`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'titles' tab root, return the site-specific Titles title
  if (tab === 'titles') {
    const siteTitle = `${displayFromParam} Titles | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Titles`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'least' tab root, return the site-specific Least Games title
  if (tab === 'least') {
    const siteTitle = `${displayFromParam} Least Games Lost to Reach a Round | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Least Games`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'average-age' tab root, return the site-specific Average Age title
  if (tab === 'average-age') {
    const siteTitle = `${displayFromParam} Average Age Records | Tennis Statistics`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Average Age`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'percentage' tab root, return the site-specific Percentages title
  if (tab === 'percentage') {
    const siteTitle = `${displayFromParam} Percentages | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Percentages`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'streak' tab root, return the site-specific Longest Winning Streaks title
  if (tab === 'streak') {
    const siteTitle = `${displayFromParam} Longest Winning Streaks | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Longest Winning Streaks`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'timespan' tab root, return the site-specific Timespans title
  if (tab === 'timespan') {
    const siteTitle = `${displayFromParam} Timespans | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Timespans`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Return deterministic metadata based on the path (fast and reliable)
  return {
    title: titleFromParam,
    openGraph: { title: titleFromParam, url: ogUrlFromParam, siteName: 'TennisMyLife', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - ${typeLabelFromParam}`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: titleFromParam, images: [ogImageFromParam] },
    alternates: { canonical: ogUrlFromParam },
  };
}

export default async function RecordsTabPage({ params }: { params: Promise<{ id: string; tab?: string }> }) {
  const { id, tab } = await params;
  // server-rendered tournament name for authoritative H1
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  // DEBUG: log server invocation in tests to help diagnose missing H1s
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log('RecordsTabPage server render', { id, tab });
  }

  const tabLabels: Record<string, string> = {
    count: 'Open Era Records',
    rounds: 'Records by Round',
    ages: 'Ages',
    percentage: 'Percentages',
    timespan: 'Timespans',
    'rounds-on-entries': 'Round Efficiency by Entries',
    least: 'Least Games Lost to Reach a Round',
    'average-age': 'Average Age Records',
  };

  function humanizeName(name: string) {
    return String(name || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const recordTitle = tab ? (tabLabels[tab] ?? humanizeName(tab)) : 'Records';
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = tab === 'count'
    ? `${site}/tournaments/${slugId}/records/count`
    : tab === 'ages'
      ? `${site}/tournaments/${slugId}/records/ages`
      : `${site}/tournaments/${slugId}/records${tab ? `/${tab}` : ''}`;
  const pageTitle = (() => {
    if (tab === 'rounds') return `${tournamentName} Records by Round | Tennis Records`;
    if (tab === 'count') return `${tournamentName} Open Era Records | Tennis My Life`;
    if (tab === 'rounds-on-entries' || tab === 'roundsonentries') return `${tournamentName} Rounds on Entries | Tennis Records`;
    if (tab === 'least') return `${tournamentName} Least Games Lost to Reach a Round | Tennis Records`;
    if (tab === 'average-age') return `${tournamentName} Average Age Records | Tennis Statistics`;
    if (tab === 'percentage') return `${tournamentName} Percentages | Tennis Records`;
    if (tab === 'streak') return `${tournamentName} Longest Winning Streaks | Tennis Records`;
    if (tab === 'timespan') return `${tournamentName} Timespans | Tennis Records`;
    return tab ? `${tournamentName} | ${recordTitle}` : `${tournamentName} Records`;
  })();
  const pageDescription = (() => {
    if (tab === 'count') return `Open Era records and statistics for ${tournamentName}. Explore titles, wins, matches played, and entries.`;
    if (tab === 'rounds') return `Round-by-round records for ${tournamentName}, including the players with the most appearances in each stage of the tournament.`;
    if (tab === 'ages') return `Youngest and oldest player records for ${tournamentName} across the Open Era men's singles main draw.`;
    if (tab === 'percentage') return `Winning percentage records for ${tournamentName}, with overall efficiency and round-based performance statistics.`;
    if (tab === 'streak') return `Longest winning streak records for ${tournamentName} in the Open Era men's singles main draw.`;
    if (tab === 'least') return `Least games lost records at ${tournamentName}, highlighting the most dominant runs through the tournament draw.`;
    if (tab === 'timespan') return `Timespan records for ${tournamentName}, including long gaps between appearances, wins, and titles.`;
    if (tab === 'rounds-on-entries' || tab === 'roundsonentries') return `Round efficiency records for ${tournamentName}, comparing how far players advanced relative to their entries.`;
    if (tab === 'average-age') return `Average age records for ${tournamentName}, tracking long-term generational trends across the Open Era.`;
    return `Tournament records and statistics for ${tournamentName}.`;
  })();
  const keywords = `${tournamentName}, tennis records, ${recordTitle}, open era stats`;

  // H1 should be: "{tournamentName} | {recordTitle}" (server-rendered)

  // H2 headings for each section (anchors)
  const sectionOrder = [
    { key: 'count', label: 'Counts' },
    { key: 'rounds', label: 'Rounds' },
    { key: 'ages', label: 'Ages' },
    { key: 'percentage', label: 'Percentages' },
    { key: 'timespan', label: 'Timespans' },
    { key: 'rounds-on-entries', label: 'Round Efficiency by Entries' },
    { key: 'least', label: 'Least' },
    { key: 'average-age', label: 'Average Age' },
  ];

  // For server-rendering contexts, normalize to a Promise that resolves to { id }
  const idPromise = Promise.resolve({ id });

  // SSR data fetch for the active tab — allows tables to render in initial HTML
  async function fetchTabSSRData(tabName: string | undefined): Promise<any> {
    if (!tabName) return null;
    const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const apiMap: Record<string, string> = {
      streak: `/api/tournaments/${id}/records/streak`,
      rounds: `/api/tournaments/${id}/records/rounds`,
      least: `/api/tournaments/${id}/records/least`,
      timespan: `/api/tournaments/${id}/records/timespan`,
      'rounds-on-entries': `/api/tournaments/${id}/records/roundsonentries`,
      roundsonentries: `/api/tournaments/${id}/records/roundsonentries`,
      'average-age': `/api/tournaments/${id}/records/averageage`,
      percentage: `/api/tournaments/${id}/records/percentage/wins`,
    };
    const path = apiMap[tabName];
    if (!path) return null;
    try {
      const res = await fetch(`${base}${path}`, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  const sectionData = await fetchTabSSRData(tab);

  const headerTitle = tab ? `${tournamentName} | ${recordTitle}` : `${tournamentName} Records`;
  return (
    <div>
      <main className="w-full mx-auto py-8 px-0 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
          <RecordsWebPageJsonLd
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            canonical={canonical}
            keywords={keywords}
          />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-center">{headerTitle}</h1>



          {/* Client-side interactive page (keeps existing loading/fallback logic for data tables) */}
          <RecordsPageClient
            params={idPromise}
            initialTournament={{ id, slug: slugId, name: tournamentName }}
            initialPathId={slugId}
            initialActiveTab={tab}
            initialStreakData={tab === 'streak' ? sectionData : undefined}
            initialRoundsData={tab === 'rounds' ? sectionData : undefined}
            initialLeastData={tab === 'least' ? sectionData : undefined}
            initialTimespanData={tab === 'timespan' ? sectionData : undefined}
            initialRoundsOnEntriesData={(tab === 'rounds-on-entries' || tab === 'roundsonentries') ? sectionData : undefined}
            initialAverageAgeData={tab === 'average-age' ? sectionData : undefined}
            initialPercentageData={tab === 'percentage' ? sectionData : undefined}
          />
      </main>
    </div>
  );
}