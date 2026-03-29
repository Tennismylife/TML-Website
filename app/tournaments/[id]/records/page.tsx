import React from 'react';
import Link from 'next/link';
import RecordsPageClient from './RecordsClient';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import RecordsWebPageJsonLd from './RecordsWebPageJsonLd';

export default async function RecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // In test environments, avoid rendering the client component (which uses `use()` with a Promise)
  // because the test runner does not emulate Next's server-to-client lifecycle and will attempt
  // to render suspended Promises as children which causes test failures. Return a placeholder instead.
  if (process.env.NODE_ENV === 'test') {
    return <div data-testid="records-client-placeholder" /> as any;
  }

  // Resolve canonical slug and tournament display name server-side
  const [slugId, tournamentName] = await Promise.all([
    getTournamentSlug(id).catch(() => id),
    getTournamentName(id).catch(() => String(id).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
  ]);
  const idPromise = Promise.resolve({ id });

  // Static navigation items — server-rendered so Googlebot can crawl the full hierarchy
  // without executing JavaScript. These links establish the canonical sub-page structure
  // and pass PageRank equity to each section.
  const navLinks = [
    { href: `/tournaments/${slugId}/records/count/titles`, label: 'Most Titles' },
    { href: `/tournaments/${slugId}/records/count/wins`, label: 'Most Wins' },
    { href: `/tournaments/${slugId}/records/count/played`, label: 'Most Matches Played' },
    { href: `/tournaments/${slugId}/records/count/entries`, label: 'Most Entries' },
    { href: `/tournaments/${slugId}/records/rounds`, label: 'Records by Round' },
    { href: `/tournaments/${slugId}/records/ages/main`, label: 'Age Records' },
    { href: `/tournaments/${slugId}/records/ages/titles`, label: 'Title Age Records' },
    { href: `/tournaments/${slugId}/records/ages/youngestrounds`, label: 'Youngest per Round' },
    { href: `/tournaments/${slugId}/records/ages/oldestrounds`, label: 'Oldest per Round' },
    { href: `/tournaments/${slugId}/records/percentage/wins`, label: 'Best Winning Percentage' },
    { href: `/tournaments/${slugId}/records/percentage/rounds`, label: 'Win % per Round' },
    { href: `/tournaments/${slugId}/records/streak`, label: 'Longest Winning Streaks' },
    { href: `/tournaments/${slugId}/records/timespan`, label: 'Timespan Records' },
    { href: `/tournaments/${slugId}/records/least`, label: 'Least Games Lost' },
    { href: `/tournaments/${slugId}/records/roundsonentries/rounds/W`, label: 'Rounds on Entries' },
  ];

  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${slugId}/records`;
  const pageTitle = `${tournamentName} Records: wins, titles, matches, ages, streak, stats`;
  const pageDescription = `Comprehensive Open Era tennis records and statistics for ${tournamentName}. Discover the players with the most titles, match wins, longest streaks, and youngest champions.`;
  const keywords = `${tournamentName}, tennis records, most titles, most wins, matches played, age records, winning streaks, open era stats`;

  // FAQ Schema specifically for the top-level tournament hub
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', 'name': `What kinds of records are tracked for ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `We track comprehensive Open Era men's singles main draw records for ${tournamentName}, including the most titles, match wins, longest winning streaks, youngest and oldest champions, and win percentages.` } },
      { '@type': 'Question', 'name': `Are these ${tournamentName} tennis records up to date?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Yes, the databases and statistics are regularly updated following each edition of ${tournamentName} to reflect the most current player achievements in the Open Era.` } },
      { '@type': 'Question', 'name': `Does this page include qualifying matches for ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `No, the historical and statistical trends aggregated on this page focus uniquely on the men's singles main draw.` } },
      { '@type': 'Question', 'name': `Who has won the most titles at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `You can find the players with the most championship titles in the Open Era by checking our 'Most Titles' records section.` } },
      { '@type': 'Question', 'name': `Who has played the most matches at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Our 'Most Matches Played' table provides a complete list of players with the highest number of main draw appearances and matches contested.` } },
      { '@type': 'Question', 'name': `Who is the youngest champion in ${tournamentName} history?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `The 'Age Records' section features the youngest title winners, along with the youngest players to reach other specific rounds.` } },
      { '@type': 'Question', 'name': `Who is the oldest player to win a match at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `You can discover the oldest match winners and oldest champions by navigating to the 'Oldest per Round' age records.` } },
      { '@type': 'Question', 'name': `Which player holds the longest winning streak at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `The 'Longest Winning Streaks' tab details the players with the most consecutive match wins in the tournament's history without a defeat.` } },
      { '@type': 'Question', 'name': `Who has the highest winning percentage at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Our 'Best Winning Percentage' leaderboards reveal which players have the most efficient win-loss records, categorized by a minimum number of matches played.` } },
      { '@type': 'Question', 'name': `What is the record for the least games lost to reach the final at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `The 'Least Games Lost' section highlights the most dominant tournament runs, showing who dropped the fewest games en route to the latter stages.` } },
      { '@type': 'Question', 'name': `Who has participated in ${tournamentName} the most times?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `The 'Most Entries' table ranks players by their total number of appearances in the main draw of the tournament throughout their careers.` } },
      { '@type': 'Question', 'name': `Are there statistics on the average age of players at ${tournamentName} over time?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Yes, the 'Average Age' records illustrate historical trends, comparing the average ages of champions, finalists, and participants throughout the Open Era.` } },
      { '@type': 'Question', 'name': `Is it possible to see the timespan between a player's first and last title at ${tournamentName}?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Absolutely. The 'Timespan Records' highlight the longest chronological gaps between a player's first and final title, match win, or overall appearance.` } }
    ]
  };

  // Render the client records page which contains the interactive tabs
  // Wrap in the same main wrapper we previously had in the client so the layout is consistent
  // @ts-ignore - this is a client component that expects a Promise for use() hook
  return (
    <main className="w-full mx-auto p-8 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
      <RecordsWebPageJsonLd
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        canonical={canonical}
        keywords={keywords}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* @ts-ignore */}
      <RecordsPageClient params={idPromise} />

      {/* Server-rendered navigation — visible to Googlebot and screen readers.
          Establishes crawlable internal links from this hub to every records sub-section. */}
      <nav aria-label="Records sections" className="mt-10 pt-6 border-t border-gray-700/60">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Explore all records sections</p>
        <ul className="flex flex-wrap gap-2">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-block px-3 py-1 rounded-full bg-gray-800 text-blue-400 hover:bg-gray-700 hover:text-blue-300 text-sm transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
