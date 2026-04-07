import StreakCount from "./Count/page";
import StreakTop from "./Top/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const page = Number((sp.page as string) ?? 1);
  return {
    title: 'Consecutive Weeks ATP Ranking Records | Longest Streaks',
    description: 'Longest consecutive weeks at No. 1 and inside the Top 5, Top 10 in ATP ranking history. All-time streak leaderboards.',
    keywords: ['consecutive weeks ATP number 1', 'longest streak No 1 ATP', 'consecutive weeks top 5 ATP', 'ATP streak records', 'longest ATP ranking streak', 'open era consecutive weeks'],
    alternates: { canonical: `${SITE}/recordsranking/streak` },
    openGraph: { type: 'website', url: `${SITE}/recordsranking/streak`, siteName: 'TennisMyLife', title: 'Consecutive Weeks ATP Ranking Records | Longest Streaks', description: 'Longest consecutive weeks at No. 1 and inside the Top 5/10 in ATP ranking history.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Consecutive Weeks Records' }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Consecutive Weeks ATP Ranking Records | Longest Streaks', description: 'Longest consecutive weeks at No. 1 and inside the Top 5/10 in ATP ranking history.', images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  };
}

export default async function Streak({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const child = sub === 'Top' ? <StreakTop searchParams={searchParams} /> : <StreakCount searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Consecutive Weeks ATP Ranking Records | Longest Streaks',
        'description': 'Longest consecutive weeks at No. 1 and inside the Top 5, Top 10 in ATP ranking history. All-time streak leaderboards.',
        'url': `${SITE}/recordsranking/streak`,
      }) }} />
      {child}
    </>
  );
}
