
// app/tournaments/[id]/records/count/titles/page.tsx
import React from 'react';
import Link from 'next/link';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';
import { getTournamentName } from '@/lib/recordMetadata';
import { getCountSection } from '@/lib/records/count';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

type PageParams = { params: any };

// ---------- METADATA ----------
export async function generateMetadata({ params }: PageParams) {
  const { id } = params;
  const tournamentName = await getTournamentName(id);

  const title = `Most Titles at ${tournamentName} | Tennis Records`;
  const description = `ATP men's singles record: most ${tournamentName} titles in the Open Era. Interactive table with counts and years won.`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const ogUrl = 'https://stats.tennismylife.org/tournaments/australian-open/records/titles';
  const ogImage = `${site}/og/site-preview.png`;

  // FAQ JSON-LD for SEO (server-side as well as client-side via Script)
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: "What does 'Most Titles' show?", acceptedAnswer: { '@type': 'Answer', text: `It lists ATP men's singles players with the highest number of ${tournamentName} titles in the Open Era, based on official results recorded in our database.` } },
      { '@type': 'Question', name: 'How are ties handled in the ranking?', acceptedAnswer: { '@type': 'Answer', text: 'Players with the same number of titles are shown with equal rank. Secondary ordering is alphabetical unless you apply a different sort on the table.' } },
      { '@type': 'Question', name: 'What data is included or excluded?', acceptedAnswer: { '@type': 'Answer', text: `Included: ${tournamentName} men's singles (Open Era). Excluded: women's events, doubles, mixed doubles, juniors, qualifying and exhibitions.` } },
      { '@type': 'Question', name: 'What is the time coverage of the data?', acceptedAnswer: { '@type': 'Answer', text: 'The page covers the Open Era. Historical editions outside the Open Era may be presented separately.' } },
      { '@type': 'Question', name: 'How often is this data updated?', acceptedAnswer: { '@type': 'Answer', text: 'Data is updated automatically when new official results are imported into the dataset. During the tournament, updates may occur daily.' } },
      { '@type': 'Question', name: 'Can I link directly to this page?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. This page has a canonical URL and supports social previews for sharing.' } },
    ],
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: ogUrl,
      siteName: 'TML',
      images: [{ url: ogImage, alt: `${tournamentName} - Most Titles`, width: 1200, height: 630, type: 'image/png' }],
      type: 'website'
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: ogUrl },
    robots: {
      index: true,
      follow: true,
      maxSnippet: -1,
      maxImagePreview: 'large',
      maxVideoPreview: -1,
    },
    other: {
      'script[data-schema="faq"][type="application/ld+json"]': JSON.stringify(faq),
    },
  };
}

// ---------- PAGE ----------
export default async function TitlesPage({ params }: PageParams) {
  const { id } = params;
  const tournamentName = await getTournamentName(id);

  const list = await getCountSection(id, 'titles');

  // FAQ JSON-LD (iniezione corretta come <script type="application/ld+json">)
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: "What does 'Most Titles' show?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: `It lists ATP men's singles players with the highest number of ${tournamentName} titles in the Open Era, based on official results recorded in our database.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How are ties handled in the ranking?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Players with the same number of titles are shown with equal rank. Secondary ordering is alphabetical unless you apply a different sort on the table.',
        },
      },
      {
        '@type': 'Question',
        name: 'What data is included or excluded?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Included: ${tournamentName} men's singles (Open Era). Excluded: women's events, doubles, mixed doubles, juniors, qualifying and exhibitions.`,
        },
      },
      {
        '@type': 'Question',
        name: 'What is the time coverage of the data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The page covers the Open Era. Historical editions outside the Open Era may be presented separately.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often is this data updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Data is updated automatically when new official results are imported into the dataset. During the tournament, updates may occur daily.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I link directly to this page?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. This page has a canonical URL and supports social previews for sharing.',
        },
      },
    ],
  };

  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="gap-4 px-6 py-3 text-base md:text-lg rounded-full" />
      {/* JSON-LD FAQ injection */}
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Most Titles at ${tournamentName}`}</h1>
        <CountFull id={id} section="titles" list={list} tourneyName={tournamentName} />
      </main>
    </div>
  );
}
