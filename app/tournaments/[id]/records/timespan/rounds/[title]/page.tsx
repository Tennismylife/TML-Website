import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';
import { getTournamentName, makeTitle } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import ViewRecordsCTA from '../../../ViewRecordsCTA';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Biggest timespan between 2 ${getRoundFullName(String(title))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <TimespanFull id={id} title={title} section="rounds" />
    </div>
  );
}
