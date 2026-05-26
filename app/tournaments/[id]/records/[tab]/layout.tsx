import type { Metadata } from 'next';
import { getTournamentSlug, isSlamTournamentSlug } from '@/lib/getTournamentName';

// All routes matched by the [tab] catch-all render the full client-side RecordsPageClient
// with no pre-fetched data — thin server content. Slams are always indexable.
export async function generateMetadata({ params }: { params: Promise<{ id: string; tab: string }> }): Promise<Metadata> {
  const { id } = await params;
  const slug = await getTournamentSlug(id).catch(() => id);
  return {
    robots: {
      index: isSlamTournamentSlug(slug),
      follow: true,
    },
  };
}

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
