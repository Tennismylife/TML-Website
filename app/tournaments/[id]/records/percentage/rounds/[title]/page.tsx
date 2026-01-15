import PercentageFull from '@/app/tournaments/[id]/records/percentage/_components/PercentageFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: { id: string; title: string } }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Best winning percentage in ${String(title)}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return <PercentageFull id={id} section="rounds" title={title} />;
}