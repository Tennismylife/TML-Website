import Count from "./Count/page";
import Top from "./Top/page";
import StreakCount from "./StreakCount/page";
import StreakTop from "./StreakTop/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const page = Number((sp.page as string) ?? 1);
  return {
    title: 'Year-End ATP Ranking Records | All-Time Finishes',
    description: 'All-time ATP year-end ranking records: most seasons at No. 1, top 5 year-end finishes, consecutive year-end streaks and more.',
    keywords: ['year-end ATP ranking records', 'year-end No 1 ATP', 'most year-end top 5', 'consecutive year-end finishes', 'ATP year-end history', 'year-end ranking all-time'],
    alternates: { canonical: `${SITE}/recordsranking/endoftheseason` },
    openGraph: { type: 'website', url: `${SITE}/recordsranking/endoftheseason`, siteName: 'TennisMyLife', title: 'Year-End ATP Ranking Records | All-Time Finishes', description: 'All-time ATP year-end ranking records including most seasons at No. 1 and consecutive year-end streaks.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Year-End ATP Ranking Records' }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Year-End ATP Ranking Records | All-Time Finishes', description: 'All-time ATP year-end ranking records including most seasons at No. 1 and consecutive year-end streaks.', images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  };
}

export default async function EndSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const child = sub === 'Top' ? <Top searchParams={searchParams} />
    : sub === 'StreakCount' ? <StreakCount searchParams={searchParams} />
    : sub === 'StreakTop' ? <StreakTop searchParams={searchParams} />
    : <Count searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Year-End ATP Ranking Records | All-Time Finishes',
        'description': 'All-time ATP year-end ranking records: most seasons at No. 1, top 5 year-end finishes, consecutive year-end streaks and more.',
        'url': `${SITE}/recordsranking/endoftheseason`,
      }) }} />
      {child}
    </>
  );
}
