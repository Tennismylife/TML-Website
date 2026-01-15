import RoundOnEntriesFull from '@/app/tournaments/[id]/records/roundsonentries/_components/RoundOnEntriesFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: { id: string; title: string } }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  // Special-case Winner -> Titles phrasing
  const label = String(title).toLowerCase() === 'winner' ? 'Most Titles on Entries' : `Most ${String(title)}s on Entries`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return <RoundOnEntriesFull params={{ id, title }} />;
}
