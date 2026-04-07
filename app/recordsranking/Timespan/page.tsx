import TimespanCount from "./TimespanCount/page";
import TimespanTop from "./TimespanTop/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const page = Number((sp.page as string) ?? 1);
  return {
    title: 'Career Timespan ATP Ranking Records | First to Last Appearance',
    description: 'Longest career timespan between a player\'s first and last ATP ranking appearance at any given position. All-time leaderboard.',
    keywords: ['ATP career timespan', 'first last ATP ranking', 'longest span at No 1', 'career duration ATP', 'ATP history timespan', 'open era career span'],
    alternates: { canonical: `${SITE}/recordsranking/timespan` },
    openGraph: { type: 'website', url: `${SITE}/recordsranking/timespan`, siteName: 'TennisMyLife', title: 'Career Timespan ATP Ranking Records', description: 'Longest career timespan between first and last ATP ranking appearance at any given position.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Career Timespan Records' }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Career Timespan ATP Ranking Records', description: 'Longest career timespan between first and last ATP ranking appearance at any given position.', images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  };
}

export default async function Timespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const child = sub === 'Top' ? <TimespanTop searchParams={searchParams} /> : <TimespanCount searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Career Timespan ATP Ranking Records | First to Last Appearance',
        'description': "Longest career timespan between a player's first and last ATP ranking appearance at any given position. All-time leaderboard.",
        'url': `${SITE}/recordsranking/timespan`,
      }) }} />
      {child}
    </>
  );
}
