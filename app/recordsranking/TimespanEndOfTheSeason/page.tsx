import TimespanCountEndOfTheSeason from "./TimespanCountEndOfTheSeason/page";
import TimespanTopEndOfTheSeason from "./TimespanTopEndOfTheSeason/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const page = Number((sp.page as string) ?? 1);
  return {
    title: 'Year-End Career Timespan ATP Records | First to Last Season',
    description: 'Longest year-end career timespan between a player\'s first and last year-end finish at any given ATP ranking position.',
    keywords: ['ATP year-end career timespan', 'first last year-end ATP', 'longest year-end span', 'year-end career duration ATP', 'ATP year-end history timespan'],
    alternates: { canonical: `${SITE}/recordsranking/timespanendoftheseason` },
    openGraph: { type: 'website', url: `${SITE}/recordsranking/timespanendoftheseason`, siteName: 'TennisMyLife', title: 'Year-End Career Timespan ATP Records', description: 'Longest year-end career timespan between first and last year-end finish at any given ATP ranking position.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Year-End Career Timespan Records' }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Year-End Career Timespan ATP Records', description: 'Longest year-end career timespan between first and last year-end finish at any given ATP ranking position.', images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  };
}

export default async function TimespanEndOfTheSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const child = sub === 'Top' ? <TimespanTopEndOfTheSeason searchParams={searchParams} /> : <TimespanCountEndOfTheSeason searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Year-End Career Timespan ATP Records | First to Last Season',
        'description': "Longest year-end career timespan between a player's first and last year-end finish at any given ATP ranking position.",
        'url': `${SITE}/recordsranking/timespanendoftheseason`,
      }) }} />
      {child}
    </>
  );
}
