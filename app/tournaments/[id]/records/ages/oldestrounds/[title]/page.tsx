import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Oldest Players in ${String(title)}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <AgesFull id={id} section="oldestrounds" title={title} />
    </div>
  );
}