import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await getTournamentName(id);
  return { title: `Youngest Players in Main Draw at ${tournamentName}` };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <AgesFull id={id} section="main" which="youngest" />
    </div>
  );
}
