import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  // Use a site-specific phrasing for win percentage titles
  return { title: `Best Winning Percentage at ${tournamentName}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Ensure server renders an H1 for the percentage tab
  return <TournamentPage params={Promise.resolve({ id, tab: 'percentage' })} />;
}