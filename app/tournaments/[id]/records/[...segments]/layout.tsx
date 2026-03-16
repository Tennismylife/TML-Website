import type { Metadata } from 'next';

// All routes matched by the [...segments] catch-all render the full client-side RecordsPageClient
// with no pre-fetched data — thin server content. Mark them noindex so Google focuses
// crawl budget on the rich, data-specific leaf pages (count/titles, percentage/rounds/[title], etc.).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SegmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
