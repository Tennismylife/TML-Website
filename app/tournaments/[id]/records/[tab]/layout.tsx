import type { Metadata } from 'next';

// All routes matched by the [tab] catch-all render the full client-side RecordsPageClient
// with no pre-fetched data — thin server content. Mark them noindex so Google focuses
// crawl budget on the rich, data-specific sub-pages (count/titles, ages/titles/oldest, etc.).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
