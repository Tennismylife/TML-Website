import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: { id: string; title: string } }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Biggest timespan between 2 ${String(title)}s`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return <TimespanFull id={id} title={title} section="rounds" />;
}
