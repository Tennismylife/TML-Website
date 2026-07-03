import React from 'react';
import Link from 'next/link';
import RecordsTabs from './RecordsTabs';
import RecordsItemListJsonLd from './RecordsJsonLd';
import { metadataBase } from '../../lib/site';
import { resolveCanonicalRecordHref, resolveRecordHref } from './record-links';
import type { Metadata } from 'next';

const CANONICAL = new URL('/records', metadataBase).toString();
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

const recordHref = (slug: string[], filters: Record<string, any> = {}) =>
  resolveRecordHref(slug, filters as any);

const categories: Category[] = [
  {
    key: 'wins',
    label: 'Wins',
    desc: 'All-time most match wins in ATP history.',
    href: recordHref(['wins']),
    emoji: '🏆',
  },
  {
    key: 'played',
    label: 'Played',
    desc: 'Most matches played throughout a career.',
    href: recordHref(['played']),
    emoji: '🎾',
  },
  {
    key: 'titles',
    label: 'Titles',
    desc: 'Most tournament titles won at any level.',
    href: recordHref(['titles']),
    emoji: '🥇',
  },
  {
    key: 'entries',
    label: 'Appearances',
    desc: 'Most tournament entries over a career.',
    href: recordHref(['entries']),
    emoji: '📋',
  },
  {
    key: 'count',
    label: 'Count',
    desc: 'Counts and aggregated stats by category.',
    href: recordHref(['count']),
    emoji: '🔢',
  },
  {
    key: 'percentage',
    label: 'Win Percentage',
    desc: 'Best win percentage records in ATP history.',
    href: recordHref(['percentage']),
    emoji: '📊',
  },
  {
    key: 'ages',
    label: 'Ages',
    desc: 'Youngest and oldest players in ATP history.',
    href: recordHref(['ages', 'oldest']),
    emoji: '🎂',
    children: [
      { label: 'Oldest Main Draw', href: recordHref(['ages', 'oldest']) },
      { label: 'Youngest Main Draw', href: recordHref(['ages', 'youngest']) },
      { label: 'Oldest Title Winners', href: recordHref(['ages', 'oldest-winners']) },
      { label: 'Youngest Title Winners', href: recordHref(['ages', 'youngest-winners']) },
    ],
  },
  {
    key: 'streak',
    label: 'Streak',
    desc: 'Longest consecutive winning streaks.',
    href: '/records/longest-winning-streak',
    emoji: '🔥',
    children: [
      { label: 'Win Streak', href: '/records/longest-winning-streak' },
      { label: 'Round Streak', href: recordHref(['streak', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'timespan',
    label: 'Timespan',
    desc: 'Longest timespans between career milestones.',
    href: recordHref(['timespan', 'entries']),
    emoji: '⏳',
    children: [
      { label: 'Between Entries', href: recordHref(['timespan', 'entries']) },
      { label: 'Between Titles', href: recordHref(['timespan', 'titles']) },
      { label: 'Between Finals', href: recordHref(['timespan', 'rounds'], { round: 'F' }) },
    ],
  },
  {
    key: 'atage',
    label: 'At Age',
    desc: 'Records achieved at a specific age.',
    href: recordHref(['atage', 'wins']),
    emoji: '📅',
    children: [
      { label: 'Wins at Age', href: recordHref(['atage', 'wins']) },
      { label: 'Titles at Age', href: recordHref(['atage', 'titles']) },
      { label: 'Entries at Age', href: recordHref(['atage', 'entries']) },
      { label: 'Rounds at Age', href: recordHref(['atage', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'ageofnth',
    label: 'Age at Nth',
    desc: 'Age when reaching the Nth career milestone.',
    href: recordHref(['ageofnth', 'wins']),
    emoji: '🔖',
    children: [
      { label: 'Age at Nth Win', href: recordHref(['ageofnth', 'wins']) },
      { label: 'Age at Nth Title', href: recordHref(['ageofnth', 'titles']) },
      { label: 'Age at Nth Slam', href: recordHref(['ageofnth', 'slams']) },
    ],
  },
  {
    key: 'roundsonentries',
    label: 'Results by Appearances',
    desc: 'Best rounds reached per tournament entry.',
    href: recordHref(['roundsonentries', 'titles']),
    emoji: '📈',
    children: [
      { label: 'Titles per Entry', href: recordHref(['roundsonentries', 'titles']) },
      { label: 'Round per Entry', href: recordHref(['roundsonentries', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'same',
    label: 'Single Tournament',
    desc: 'Records at the same tournament across editions.',
    href: recordHref(['same', 'wins']),
    emoji: '🏟️',
    children: [
      { label: 'Wins', href: recordHref(['same', 'wins']) },
      { label: 'Grand Slam Wins', href: recordHref(['same', 'wins'], { level: 'G' }) },
      { label: 'Titles', href: recordHref(['same', 'titles']) },
      { label: 'Entries', href: recordHref(['same', 'entries']) },
      { label: 'Rounds', href: recordHref(['same', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'seasons',
    label: 'Single Season',
    desc: 'Records accumulated across multiple seasons.',
    href: recordHref(['seasons', 'wins']),
    emoji: '📆',
    children: [
      { label: 'Wins per Season', href: recordHref(['seasons', 'wins']) },
      { label: 'Titles per Season', href: recordHref(['seasons', 'titles']) },
      { label: 'Appearances per Season', href: '/records/most-tournament-appearances-in-single-season' },
      { label: 'Win % per Season', href: recordHref(['seasons', 'percentage']) },
      { label: 'Rounds per Season', href: recordHref(['seasons', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'neededto',
    label: 'Needed To',
    desc: 'Matches needed to reach milestone targets.',
    href: recordHref(['neededto', 'titles']),
    emoji: '🎯',
    children: [{ label: 'Titles', href: recordHref(['neededto', 'titles']) }],
  },
  {
    key: 'counterseasons',
    label: 'Counter Seasons',
    desc: 'Count of seasons achieving specific records.',
    href: recordHref(['counterseasons', 'round'], { round: 'F' }),
    emoji: '🗓️',
    children: [
      { label: 'Rounds', href: recordHref(['counterseasons', 'round'], { round: 'F' }) },
      { label: 'Titles', href: recordHref(['counterseasons', 'titles']) },
      { label: 'Wins', href: recordHref(['counterseasons', 'wins']) },
    ],
  },
  {
    key: 'h2h',
    label: 'Head-to-Head',
    desc: 'H2H records and rivalry stats between players.',
    href: recordHref(['h2h', 'count']),
    emoji: '⚔️',
    children: [{ label: 'H2H Count', href: recordHref(['h2h', 'count']) }],
  },
];

// ─── Filtered quick-links ─────────────────────────────────────────────────────

type FilteredLink = { label: string; href: string };
type FilterGroup = { title: string; color: string; links: FilteredLink[] };

const CORE_RECORDS: { tab: string; sub: string | null; label: string }[] = [
  { tab: 'wins',           sub: null,         label: 'Wins' },
  { tab: 'titles',         sub: null,         label: 'Titles' },
  { tab: 'entries',        sub: null,         label: 'Entries' },
  { tab: 'percentage',     sub: null,         label: 'Win %' },
  { tab: 'streak',         sub: 'wins',       label: 'Win Streak' },
  { tab: 'streak',         sub: 'round',      label: 'Round Streak' },
  { tab: 'ages',           sub: 'oldest',     label: 'Oldest in Draw' },
  { tab: 'ages',           sub: 'youngest',   label: 'Youngest in Draw' },
  { tab: 'ages',           sub: 'oldest-winners', label: 'Oldest Winner' },
  { tab: 'ages',           sub: 'youngest-winners', label: 'Youngest Winner' },
  { tab: 'counterseasons', sub: 'round',      label: 'Counter Seasons' },
  { tab: 'timespan',       sub: 'titles',     label: 'Timespan Titles' },
];

function makeFilteredLinks(paramKey: string, paramValue: string) {
  return CORE_RECORDS.flatMap(r => {
    const slug = r.sub ? [r.tab, r.sub] : [r.tab];
    const filters = paramKey === 'level' ? { level: [paramValue] } : { surface: [paramValue] };
    const canonicalPath = resolveCanonicalRecordHref(slug, filters);
    return canonicalPath ? [{ label: r.label, href: canonicalPath }] : [];
  });
}

const filteredGroups: FilterGroup[] = [
  { title: 'Grand Slam Records',    color: 'from-yellow-600 to-amber-500',   links: makeFilteredLinks('level', 'G') },
  { title: 'Masters 1000 Records',  color: 'from-blue-600 to-cyan-500',      links: makeFilteredLinks('level', 'M') },
  { title: 'ATP Finals Records',    color: 'from-rose-600 to-pink-500',      links: makeFilteredLinks('level', 'F') },
  { title: 'ATP 500 Records',       color: 'from-green-600 to-emerald-500',  links: makeFilteredLinks('level', '500') },
  { title: 'ATP 250 Records',       color: 'from-purple-600 to-violet-500',  links: makeFilteredLinks('level', '250') },
  { title: 'Davis Cup Records',      color: 'from-teal-600 to-cyan-500',      links: makeFilteredLinks('level', 'D') },
  { title: 'Clay Court Records',    color: 'from-orange-700 to-red-600',     links: makeFilteredLinks('surface', 'Clay') },
  { title: 'Grass Court Records',   color: 'from-lime-700 to-green-600',     links: makeFilteredLinks('surface', 'Grass') },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

// Plain-text version — used only for JSON-LD structured data
const faqsForSchema: { q: string; a: string }[] = [
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

// Rich version with internal links — used for page rendering
const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Who holds the all-time ATP wins record?',
    a: <>Jimmy Connors holds the record for most ATP match wins with 1,274 victories. Explore the full ranking in the{' '}<Link href={recordHref(['wins'])} className="text-indigo-400 hover:text-indigo-200 underline">Wins Records</Link>{' '}section, filterable by surface, level and round.</>,
  },
  {
    q: 'Who played the most ATP matches in career?',
    a: <>Jimmy Connors also leads the &lsquo;matches played&rsquo; ranking with over 1,500 career matches. The{' '}<Link href={recordHref(['played'])} className="text-indigo-400 hover:text-indigo-200 underline">Played Records</Link>{' '}section lists the complete ranking with filters for surface and tournament level.</>,
  },
  {
    q: 'Who is the youngest ATP title winner ever?',
    a: <>The{' '}<Link href={recordHref(['ages', 'youngest-winners'])} className="text-indigo-400 hover:text-indigo-200 underline">Youngest Title Winners</Link>{' '}section shows the complete all-time ranking of players who won a title at the youngest age, filterable by surface and tournament level.</>,
  },
  {
    q: 'Who is the oldest player in an ATP main draw?',
    a: <>The{' '}<Link href={recordHref(['ages', 'oldest'])} className="text-indigo-400 hover:text-indigo-200 underline">Ages Records</Link>{' '}section tracks both the oldest and youngest players to appear in ATP main draws, covering every level from Grand Slams to 250-level events.</>,
  },
  {
    q: 'What is the longest winning streak in ATP history?',
    a: <>Guillermo Vilas holds one of the longest winning streaks in ATP history. The{' '}<Link href={recordHref(['streak', 'wins'])} className="text-indigo-400 hover:text-indigo-200 underline">Streak Records</Link>{' '}section covers both{' '}<Link href={recordHref(['streak', 'wins'])} className="text-indigo-400 hover:text-indigo-200 underline">win streaks</Link>{' '}and{' '}<Link href={recordHref(['streak', 'round'], { round: 'F' })} className="text-indigo-400 hover:text-indigo-200 underline">round-specific streaks</Link>.</>,
  },
  {
    q: 'Can I filter records by surface or tournament level?',
    a: <>Yes. Every record page includes filters for surface (Hard, Clay, Grass, Carpet), tournament level (Grand Slam, Masters 1000, ATP 500, ATP 250) and round &mdash; try them on the{' '}<Link href={recordHref(['wins'])} className="text-indigo-400 hover:text-indigo-200 underline">Wins</Link>{' '}or{' '}<Link href={recordHref(['titles'])} className="text-indigo-400 hover:text-indigo-200 underline">Titles</Link>{' '}page.</>,
  },
  {
    q: 'How are these tennis records calculated?',
    a: <>All records are computed in real-time from TennisMyLife&apos;s match database, which contains ATP match data from 1968 onwards. Start exploring from the{' '}<Link href={recordHref(['wins'])} className="text-indigo-400 hover:text-indigo-200 underline">Wins</Link>{' '}or{' '}<Link href={recordHref(['percentage'])} className="text-indigo-400 hover:text-indigo-200 underline">Win Percentage</Link>{' '}pages.</>,
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

const itemListEntries = [
  { name: 'Wins', url: new URL(recordHref(['wins']), metadataBase).toString() },
  { name: 'Titles', url: new URL(recordHref(['titles']), metadataBase).toString() },
  { name: 'Entries', url: new URL(recordHref(['entries']), metadataBase).toString() },
  { name: 'Ages', url: new URL(recordHref(['ages', 'oldest']), metadataBase).toString() },
  { name: 'Streak', url: new URL('/records/longest-winning-streak', metadataBase).toString() },
  { name: 'H2H', url: new URL(recordHref(['h2h', 'count']), metadataBase).toString() },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const webPageSchemaWithDate = {
    ...webPageSchema,
    dateModified: new Date().toISOString(),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchemaWithDate) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqsForSchema.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
      <RecordsItemListJsonLd
        name="Tennis Records navigation"
        description="A minimal overview of the main tennis record sections on TennisMyLife."
        items={itemListEntries}
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

        {/* ── Records by Level / Surface ───────────────────────────────────── */}
        <section className="px-4 pb-12 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-3">
            Explore Records by Level &amp; Surface
          </h2>
          <div className="flex flex-col gap-8">
            {filteredGroups.map(group => (
              <div key={group.title}>
                <h3 className={`inline-block text-sm font-bold px-3 py-1 rounded-full mb-3 text-white bg-gradient-to-r ${group.color}`}>
                  {group.title}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {group.links.map(link => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-white/10"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
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
