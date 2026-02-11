import React from 'react';
import Link from 'next/link';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';
import { getCountSection } from '@/lib/records/count';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await getTournamentName(id);
  // Use the requested phrasing
  const title = `Most Entries at ${tournamentName}`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${id}/count/entries`;
  const description = `Discover the players with the most entries in the men's singles main draw at ${tournamentName}. This page lists historical records from the Open Era, updated after each tournament edition.`;

  // Explicitly avoid injecting parent 'script[type="application/ld+json"]' as a meta entry
  // (we include proper <script type="application/ld+json"> JSON-LD tags in the page body)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Most entries`, width: 1200, height: 630 }],
    },
    alternates: { canonical },
    other: {
      'script[type="application/ld+json"]': undefined as any,
    },
  };
}

export default async function EntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await getTournamentName(id);

  const list = await getCountSection(id, 'entries');

  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${id}/count/entries`;

  const webPageJson = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Most entries at ${tournamentName}`,
    description: `A list of players with the most entries at ${tournamentName} (men's singles main draw).`,
    url: canonical,
  };

  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', 'name': 'What does "Most entries" at the Australian Open mean?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'It indicates the total number of entries by each player in the men\'s singles main draw at the Australian Open, summed across all editions they participated in.' } },
      { '@type': 'Question', 'name': 'Does the list cover the Open Era?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes — the list covers the Open Era; any pre‑Open inclusions (if present) will be noted on the tournament\'s page.' } },
      { '@type': 'Question', 'name': 'How do you handle ties (same number of entries)?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'In case of a tie we show players with the same count at the same rank, then order by name or by most recent year played (consistent with the table behavior).' } },
      { '@type': 'Question', 'name': 'Does the page include qualifying matches or only the main draw?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'It includes only the men\'s singles main draw, not qualifying matches.' } },
      { '@type': 'Question', 'name': 'How frequently is the data updated?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Data is updated after each tournament edition and whenever historical dataset corrections are applied.' } },
      { '@type': 'Question', 'name': 'Why do some big names have fewer entries than others?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Totals depend on how many editions a player has entered and how deep they went in each edition (i.e., run depth).' } },
      { '@type': 'Question', 'name': 'Where can I verify player profiles or full match lists?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Each name in the table links to the player profile with matches, seasons and detailed records.' } },
      { '@type': 'Question', 'name': 'Can I see the same ranking for other Grand Slams?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes — from the tournaments page you can navigate to other events and their corresponding record pages.' } },
    ],
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site + '/' },
      { '@type': 'ListItem', position: 2, name: 'Tournaments', item: site + '/tournaments' },
      { '@type': 'ListItem', position: 3, name: tournamentName, item: site + `/tournaments/${id}` },
      { '@type': 'ListItem', position: 4, name: 'Records', item: site + `/tournaments/${id}/records` },
      { '@type': 'ListItem', position: 5, name: 'Counts', item: site + `/tournaments/${id}/count` },
      { '@type': 'ListItem', position: 6, name: 'Most entries', item: canonical },
    ],
  };

  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} />

      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      {/* Server-rendered JSON-LD scripts (WebPage, FAQPage, BreadcrumbList) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main>
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Most Entries at ${tournamentName}`}</h1>
        <CountFull id={id} section="entries" list={list} tourneyName={tournamentName} />
      </main>
    </div>
  );
}
