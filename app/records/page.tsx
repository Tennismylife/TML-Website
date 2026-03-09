import React from 'react';
import Link from 'next/link';
import RecordsTabs from './RecordsTabs';
import { metadataBase } from '../../lib/site';
import type { Metadata } from 'next';

const CANONICAL = 'https://stats.tennismylife.org/records';
const OG_IMAGE = new URL('/og/site-preview.png', metadataBase).toString();

export const metadata: Metadata = {
  title: {
    absolute: 'Tennis Records – ATP Stats | TennisMyLife',
  },
  description:
    'Explore the most complete ATP tennis records database: most wins, titles, appearances, ages, longest winning streaks, head-to-head stats and more. Open Era data from 1968 to today.',
  openGraph: {
    title: 'Tennis Records – ATP Stats | TennisMyLife',
    description:
      'Explore the most complete ATP tennis records database: most wins, titles, appearances, ages, longest winning streaks, H2H and more. Open Era from 1968.',
    images: [OG_IMAGE],
    url: CANONICAL,
    siteName: 'TennisMyLife',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tennis Records – ATP Stats | TennisMyLife',
    description:
      'Explore the most complete ATP tennis records database: wins, titles, ages, streaks, H2H and more. From 1968 to today.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: CANONICAL },
};

// ─── Category data ───────────────────────────────────────────────────────────

type SubLink = { label: string; href: string };
type Category = {
  key: string;
  label: string;
  desc: string;
  href: string;
  emoji: string;
  children?: SubLink[];
};

const categories: Category[] = [
  {
    key: 'wins',
    label: 'Wins',
    desc: 'All-time most match wins in ATP history.',
    href: '/records/wins',
    emoji: '🏆',
  },
  {
    key: 'played',
    label: 'Played',
    desc: 'Most matches played throughout a career.',
    href: '/records/played',
    emoji: '🎾',
  },
  {
    key: 'titles',
    label: 'Titles',
    desc: 'Most tournament titles won at any level.',
    href: '/records/titles',
    emoji: '🥇',
  },
  {
    key: 'entries',
    label: 'Entries',
    desc: 'Most tournament entries over a career.',
    href: '/records/entries',
    emoji: '📋',
  },
  {
    key: 'count',
    label: 'Count',
    desc: 'Counts and aggregated stats by category.',
    href: '/records/count',
    emoji: '🔢',
  },
  {
    key: 'percentage',
    label: 'Win Percentage',
    desc: 'Best win percentage records in ATP history.',
    href: '/records/percentage',
    emoji: '📊',
  },
  {
    key: 'ages',
    label: 'Ages',
    desc: 'Youngest and oldest players in ATP history.',
    href: '/records/ages/oldest',
    emoji: '🎂',
    children: [
      { label: 'Oldest Main Draw', href: '/records/ages/oldest' },
      { label: 'Youngest Main Draw', href: '/records/ages/youngest' },
      { label: 'Oldest Title Winners', href: '/records/ages/oldest-winners' },
      { label: 'Youngest Title Winners', href: '/records/ages/youngest-winners' },
    ],
  },
  {
    key: 'streak',
    label: 'Streak',
    desc: 'Longest consecutive winning streaks.',
    href: '/records/streak/wins',
    emoji: '🔥',
    children: [
      { label: 'Win Streak', href: '/records/streak/wins' },
      { label: 'Round Streak', href: '/records/streak/round' },
    ],
  },
  {
    key: 'timespan',
    label: 'Timespan',
    desc: 'Longest timespans between career milestones.',
    href: '/records/timespan/entries',
    emoji: '⏳',
    children: [
      { label: 'Between Entries', href: '/records/timespan/entries' },
      { label: 'Between Titles', href: '/records/timespan/titles' },
      { label: 'Between Rounds', href: '/records/timespan/rounds' },
    ],
  },
  {
    key: 'atage',
    label: 'At Age',
    desc: 'Records achieved at a specific age.',
    href: '/records/atage/wins',
    emoji: '📅',
    children: [
      { label: 'Wins at Age', href: '/records/atage/wins' },
      { label: 'Titles at Age', href: '/records/atage/titles' },
      { label: 'Entries at Age', href: '/records/atage/entries' },
      { label: 'Rounds at Age', href: '/records/atage/round' },
    ],
  },
  {
    key: 'ageofnth',
    label: 'Age at Nth',
    desc: 'Age when reaching the Nth career milestone.',
    href: '/records/ageofnth/wins',
    emoji: '🔖',
    children: [
      { label: 'Age at Nth Win', href: '/records/ageofnth/wins' },
      { label: 'Age at Nth Title', href: '/records/ageofnth/titles' },
      { label: 'Age at Nth Slam', href: '/records/ageofnth/slams' },
    ],
  },
  {
    key: 'roundsonentries',
    label: 'Rounds on Entries',
    desc: 'Best rounds reached per tournament entry.',
    href: '/records/roundsonentries/titles',
    emoji: '📈',
    children: [
      { label: 'Titles per Entry', href: '/records/roundsonentries/titles' },
      { label: 'Round per Entry', href: '/records/roundsonentries/round' },
    ],
  },
  {
    key: 'same',
    label: 'Same Tournament',
    desc: 'Records at the same tournament across editions.',
    href: '/records/same/wins',
    emoji: '🏟️',
    children: [
      { label: 'Wins', href: '/records/same/wins' },
      { label: 'Titles', href: '/records/same/titles' },
      { label: 'Entries', href: '/records/same/entries' },
      { label: 'Rounds', href: '/records/same/round' },
    ],
  },
  {
    key: 'seasons',
    label: 'Seasons',
    desc: 'Records accumulated across multiple seasons.',
    href: '/records/seasons/wins',
    emoji: '📆',
    children: [
      { label: 'Wins per Season', href: '/records/seasons/wins' },
      { label: 'Titles per Season', href: '/records/seasons/titles' },
      { label: 'Win % per Season', href: '/records/seasons/percentage' },
      { label: 'Rounds per Season', href: '/records/seasons/round' },
    ],
  },
  {
    key: 'neededto',
    label: 'Needed To',
    desc: 'Matches needed to reach milestone targets.',
    href: '/records/neededto/titles',
    emoji: '🎯',
    children: [{ label: 'Titles', href: '/records/neededto/titles' }],
  },
  {
    key: 'counterseasons',
    label: 'Counter Seasons',
    desc: 'Count of seasons achieving specific records.',
    href: '/records/counterseasons/round',
    emoji: '🗓️',
    children: [
      { label: 'Rounds', href: '/records/counterseasons/round' },
      { label: 'Titles', href: '/records/counterseasons/titles' },
      { label: 'Wins', href: '/records/counterseasons/wins' },
    ],
  },
  {
    key: 'h2h',
    label: 'Head-to-Head',
    desc: 'H2H records and rivalry stats between players.',
    href: '/records/h2h/count',
    emoji: '⚔️',
    children: [{ label: 'H2H Count', href: '/records/h2h/count' }],
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const faqs: { q: string; a: string }[] = [
  {
    q: 'Who holds the all-time ATP wins record?',
    a: "Jimmy Connors holds the record for most ATP match wins with 1,274 victories. You can explore the full ranking in the Wins Records section, filterable by surface, level and round.",
  },
  {
    q: 'Who played the most ATP matches in career?',
    a: "Jimmy Connors also leads the 'matches played' ranking with over 1,500 career matches. The Played Records section lists the complete ranking with filters for surface and tournament level.",
  },
  {
    q: 'Who is the youngest ATP title winner ever?',
    a: 'Our Youngest Title Winners section shows the complete all-time ranking of players who won a title at the youngest age, filterable by surface and tournament level.',
  },
  {
    q: 'Who is the oldest player in an ATP main draw?',
    a: 'The Ages Records section tracks both the oldest and youngest players to appear in ATP main draws, covering every level from Grand Slams to 250-level events.',
  },
  {
    q: 'What is the longest winning streak in ATP history?',
    a: "Guillermo Vilas holds one of the longest winning streaks in ATP history. The Streak Records section covers both overall win streaks and round-specific streaks.",
  },
  {
    q: 'Can I filter records by surface or tournament level?',
    a: 'Yes. Every record page includes filters for surface (Hard, Clay, Grass, Carpet), tournament level (Grand Slam, Masters 1000, ATP 500, ATP 250) and round. Filters can be combined freely.',
  },
  {
    q: 'How are these tennis records calculated?',
    a: "All records are computed in real-time from TennisMyLife's match database, which contains ATP match data from 1968 onwards. Records can be filtered by surface, tournament level and round.",
  },
  {
    q: 'How far back does the data go?',
    a: 'The TennisMyLife database covers the Open Era starting from 1968, including all ATP-sanctioned tournaments.',
  },
];

// ─── Schema.org JSON-LD ──────────────────────────────────────────────────────

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://stats.tennismylife.org' },
    { '@type': 'ListItem', position: 2, name: 'Records', item: CANONICAL },
  ],
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Tennis Records – ATP Stats',
  description:
    'Explore the most complete ATP tennis records database: wins, titles, entries, ages, streaks, H2H and more. Open Era data from 1968 to today.',
  url: CANONICAL,
  inLanguage: 'en',
  isPartOf: {
    '@type': 'WebSite',
    name: 'TennisMyLife',
    url: 'https://stats.tennismylife.org',
  },
  breadcrumb: breadcrumbSchema,
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="w-full min-h-screen bg-gray-900 text-white">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="px-4 pt-10 pb-6 text-center max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-400 mb-6 justify-center">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden="true" className="mx-1 text-gray-600">/</span>
            <span className="text-white" aria-current="page">Records</span>
          </nav>

          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-white leading-tight">
            ATP Tennis Records
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            The most complete ATP tennis records database—<strong className="text-white">wins, titles,
            streaks, ages, head-to-head</strong> and much more. Open Era data from <strong className="text-white">1968</strong> to today,
            filterable by surface, level and round.
          </p>
        </section>

        <RecordsTabs activeTab={null} activeSubTab={null} />

        {/* ── How to navigate ──────────────────────────────────────────────── */}
        <section className="px-4 pt-8 pb-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-white border-b border-white/10 pb-3">
            How to navigate the records
          </h2>
          <ol className="flex flex-col gap-4 text-gray-300 text-sm sm:text-base">
            <li className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">1</span>
              <div>
                <strong className="text-white">Pick a category</strong> from the tab bar above (e.g. <em>Wins</em>, <em>Ages</em>, <em>Streak</em>).
                Categories that have subtopics will show a second row of subtabs when selected.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">2</span>
              <div>
                <strong className="text-white">Choose a subtab</strong> if available — for example <em>Ages</em> splits into
                Oldest / Youngest main draw and title winners; <em>Streak</em> splits into win streak and round streak.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">3</span>
              <div>
                <strong className="text-white">Apply filters</strong> to narrow results by <em>surface</em> (Hard, Clay, Grass, Carpet),
                <em> tournament level</em> (Grand Slam, Masters 1000, ATP 500, ATP 250) and <em>round</em>.
                Filters can be combined and the table updates instantly.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">4</span>
              <div>
                <strong className="text-white">Click any player or tournament</strong> in the table to jump to their dedicated stats page
                for a deeper analysis.
              </div>
            </li>
          </ol>
        </section>

        {/* ── Category grid ────────────────────────────────────────────────── */}
        <section className="px-4 pb-12 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-3">
            All Record Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <article
                key={cat.key}
                className="rounded-xl border border-white/10 bg-gray-800/60 hover:bg-gray-800 transition-colors p-4 flex flex-col gap-2"
              >
                <Link href={cat.href} className="flex items-center gap-2 group">
                  <span className="text-2xl" aria-hidden="true">{cat.emoji}</span>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                    {cat.label}
                  </h3>
                </Link>
                <p className="text-gray-400 text-sm leading-relaxed">{cat.desc}</p>
                {cat.children && (
                  <ul className="mt-1 flex flex-col gap-1">
                    {cat.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className="text-indigo-400 hover:text-indigo-200 text-sm hover:underline transition-colors"
                        >
                          → {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-3">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {faqs.map(({ q, a }, i) => (
              <details
                key={i}
                className="group rounded-xl border border-white/10 bg-gray-800/60 hover:bg-gray-800 transition-colors"
              >
                <summary className="cursor-pointer px-5 py-4 text-white font-semibold text-base list-none flex items-center justify-between gap-3 select-none">
                  <span>{q}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-gray-400 group-open:rotate-180 transition-transform duration-200 text-xl leading-none"
                  >
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-gray-300 text-sm leading-relaxed">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}