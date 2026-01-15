import LeastFull from '@/app/tournaments/[id]/records/least/_components/LeastFull';
import { getTournamentName, makeTitle, makeLeastLabel } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = makeLeastLabel(String(title));
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return <LeastFull id={id} title={title} />;
}