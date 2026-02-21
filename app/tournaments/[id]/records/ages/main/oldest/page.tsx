import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/getTournamentName';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  return { title: `Oldest Players in Main Draw at ${tournamentName}` };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Oldest Players in Main Draw at ${tournamentName}`;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{label}</h1>
      <AgesFull id={id} section="main" which="oldest" />
    </div>
  );
}
