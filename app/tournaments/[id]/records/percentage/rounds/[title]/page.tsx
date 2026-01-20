import PercentageFull from '@/app/tournaments/[id]/records/percentage/_components/PercentageFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

export async function generateMetadata({ params }: { params: { id: string; title: string } }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Best winning percentage in ${getRoundFullName(String(title))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <PercentageFull id={id} section="rounds" title={title} />
    </div>
  );
}