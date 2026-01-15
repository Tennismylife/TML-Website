import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  return { title: `Youngest Players in Main Draw at ${tournamentName}` };
}

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id } = p;
  return <AgesFull id={id} section="main" which="youngest" />;
}
