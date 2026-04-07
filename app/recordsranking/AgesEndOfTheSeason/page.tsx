import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export const metadata: Metadata = {
  title: 'Year-End Ages Records | ATP Ranking Records',
  description: 'Year-end age records in the ATP: the youngest and oldest players to finish a season at any given ranking position in Open Era history.',
  keywords: ['youngest year-end ATP', 'oldest year-end ATP', 'year-end age records ATP', 'youngest year-end No 1', 'oldest year-end top 5', 'ATP year-end records'],
  alternates: { canonical: `${SITE}/recordsranking/agesendoftheseason` },
  openGraph: { type: 'website', url: `${SITE}/recordsranking/agesendoftheseason`, siteName: 'TennisMyLife', title: 'Year-End Ages Records | ATP Ranking Records', description: 'Year-end age records in the ATP: youngest and oldest players to finish a season at any given ranking.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Year-End Ages Records' }] },
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Year-End Ages Records | ATP Ranking Records', description: 'Year-end age records in the ATP: youngest and oldest players to finish a season at any given ranking.', images: [OG_IMAGE] },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
};

export default async function AgesEndOfTheSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const child = sub === 'YoungestCount' ? <YoungestCount searchParams={searchParams} />
    : sub === 'OldestTop' ? <OldestTop searchParams={searchParams} />
    : sub === 'YoungestTop' ? <YoungestTop searchParams={searchParams} />
    : <OldestCount searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Year-End Ages Records | ATP Ranking Records',
        'description': 'Year-end age records in the ATP: the youngest and oldest players to finish a season at any given ranking position in Open Era history.',
        'url': `${SITE}/recordsranking/agesendoftheseason`,
      }) }} />
      {child}
    </>
  );
}
