import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;

export const metadata: Metadata = {
  title: 'Ages Records | ATP Ranking Records',
  description: 'Records for the youngest and oldest players in ATP ranking history, including the youngest No. 1, oldest Top 5, and more age milestones.',
  keywords: ['youngest ATP number 1', 'oldest ATP number 1', 'youngest top 5 ATP', 'oldest player ATP history', 'ATP age records', 'youngest player open era'],
  alternates: { canonical: `${SITE}/recordsranking/ages` },
  openGraph: { type: 'website', url: `${SITE}/recordsranking/ages`, siteName: 'TennisMyLife', title: 'Ages Records | ATP Ranking Records', description: 'Records for the youngest and oldest players in ATP ranking history.', images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ATP Ages Records' }] },
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: 'Ages Records | ATP Ranking Records', description: 'Records for the youngest and oldest players in ATP ranking history.', images: [OG_IMAGE] },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
};

export default async function Ages({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string | undefined) ?? 'OldestCount';

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': 'Ages Records | ATP Ranking Records',
        'description': 'Records for the youngest and oldest players in ATP ranking history, including the youngest No. 1, oldest Top 5, and more age milestones.',
        'url': `${SITE}/recordsranking/ages`,
      }) }} />
      {subtab === "OldestCount" && <OldestCount />}
      {subtab === "YoungestCount" && <YoungestCount />}
      {subtab === "OldestTop" && <OldestTop />}
      {subtab === "YoungestTop" && <YoungestTop />}
    </div>
  );
}
