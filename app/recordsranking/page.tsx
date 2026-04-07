import React from 'react';
import type { Metadata } from 'next';
import RecordsRankingLanding from './RecordsRankingLanding';
import RecordsRankingClient from './RecordsRankingClient';

const SITE = 'https://stats.tennismylife.org';
const CANONICAL = `${SITE}/recordsranking`;
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export const metadata: Metadata = {
  title: 'ATP Ranking Records | All-Time Leaderboards | Tennis My Life',
  description:
    'The complete index of ATP ranking all-time records: most weeks at No. 1, longest consecutive streaks, year-end finishes, youngest & oldest records, career timespans and points records.',
  keywords: [
    'ATP ranking records',
    'most weeks at world No 1',
    'ATP all-time leaderboards',
    'consecutive weeks at number 1',
    'year-end ATP ranking records',
    'youngest ATP number 1',
    'oldest ATP top 5',
    'career timespan ATP ranking',
    'most ATP ranking points',
    'tennis records',
    'open era ranking records',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'website',
    url: CANONICAL,
    siteName: 'TennisMyLife',
    title: 'ATP Ranking Records | All-Time Leaderboards',
    description:
      'Browse every ATP ranking all-time record: weeks at rank, consecutive streaks, year-end finishes, ages, career timespans and points records.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Ranking Records – All-Time Leaderboards' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@TennisMyLife68',
    creator: '@TennisMyLife68',
    title: 'ATP Ranking Records | All-Time Leaderboards',
    description:
      'Browse every ATP ranking all-time record: weeks at rank, consecutive streaks, year-end finishes, ages, career timespans and points records.',
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': CANONICAL,
      name: 'ATP Ranking Records — All-Time Leaderboards',
      description:
        'Complete index of ATP ranking all-time records including most weeks at No. 1, consecutive streaks, year-end finishes, youngest & oldest records, career timespans and points records.',
      url: CANONICAL,
      inLanguage: 'en-US',
      isPartOf: { '@type': 'WebSite', name: 'TennisMyLife', url: SITE },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'ATP Ranking Records', item: CANONICAL },
      ],
    },
  ],
};

export default function RecordsRankingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecordsRankingLanding
        tabBar={<RecordsRankingClient currentTabSeg={null} currentSubSeg={null} />}
      />
    </>
  );
}


