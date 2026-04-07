import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const sub = Array.isArray(sp.subtab) ? sp.subtab[0] : (sp.subtab as string | undefined) ?? null;
  const isEoy = sub === 'EndOfTheSeason';
  const title = isEoy ? 'Year-End Points Gap No. 1 vs No. 2 | ATP Ranking Records' : 'Largest Points Gap No. 1 vs No. 2 | ATP Ranking Records';
  const description = isEoy
    ? 'Largest year-end points gap between the ATP No. 1 and No. 2 player in history. All-time leaderboard.'
    : 'Largest all-time points gap between the ATP No. 1 and No. 2 player. Historical records and leaderboard.';
  const canonical = isEoy ? `${SITE}/recordsranking/diffpoints/endoftheseason` : `${SITE}/recordsranking/diffpoints/overall`;
  const keywords = isEoy
    ? ['ATP year-end points gap No 1 No 2', 'largest year-end margin', 'ATP year-end dominance', 'points difference year-end']
    : ['ATP points gap No 1 No 2', 'largest margin No 1 No 2 ATP', 'ATP dominance record', 'biggest lead ATP history', 'No 1 No 2 difference ATP'];
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

export default async function DiffPoints({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  const isEoy = sub === 'EndOfTheSeason';
  const child = isEoy ? <EndOfTheSeason searchParams={searchParams} /> : <Overall searchParams={searchParams} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': isEoy ? 'Year-End Points Gap No. 1 vs No. 2 | ATP Ranking Records' : 'Largest Points Gap No. 1 vs No. 2 | ATP Ranking Records',
        'description': isEoy ? 'Largest year-end points gap between the ATP No. 1 and No. 2 player in history. All-time leaderboard.' : 'Largest all-time points gap between the ATP No. 1 and No. 2 player. Historical records and leaderboard.',
        'url': isEoy ? `${SITE}/recordsranking/diffpoints/endoftheseason` : `${SITE}/recordsranking/diffpoints/overall`,
      }) }} />
      {child}
    </>
  );
}
