import React from 'react';
import type { Metadata } from 'next';
import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string) ?? 'Overall';
  const isEoy = subtab === 'EndOfTheSeason';
  const title = isEoy ? 'Most ATP Points at the End of The Season | ATP Ranking Records' : 'Most ATP Points All-Time | ATP Ranking Records';
  const description = isEoy
    ? 'The highest ATP ranking points ever recorded at year-end in the Open Era. All-time leaderboard.'
    : 'The highest ATP ranking points ever recorded in the Open Era. All-time leaderboard including Djokovic, Alcaraz and Nadal.';
  const canonical = `${SITE}/recordsranking/mostpoints`;
  const keywords = isEoy
    ? ['most ATP points year-end', 'highest year-end ATP points', 'ATP year-end points record', 'ATP ranking points history']
    : ['most ATP ranking points', 'highest ATP points all-time', 'ATP points record all-time', 'most points ATP history', 'Djokovic ATP points', 'Alcaraz ATP points'];
  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  };
}

export default async function MostPointsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string) ?? 'Overall';

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': subtab === 'EndOfTheSeason' ? 'Most ATP Points at the End of The Season | ATP Ranking Records' : 'Most ATP Points All-Time | ATP Ranking Records',
        'description': subtab === 'EndOfTheSeason' ? 'The highest ATP ranking points ever recorded at year-end in the Open Era. All-time leaderboard.' : 'The highest ATP ranking points ever recorded in the Open Era. All-time leaderboard including Djokovic, Alcaraz and Nadal.',
        'url': subtab === 'EndOfTheSeason' ? `${SITE}/recordsranking/mostpoints/endoftheseason` : `${SITE}/recordsranking/mostpoints/overall`,
      }) }} />
      {subtab === 'Overall' ? <Overall searchParams={searchParams} /> : <EndOfTheSeason searchParams={searchParams} />}
    </div>
  );
}
