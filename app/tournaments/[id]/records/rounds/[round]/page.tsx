import RoundFull from '../_components/RoundFull';
import { getTournamentName, makeTitle, humanize } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import { getRoundFullName } from '@/lib/utils';

export async function generateMetadata({ params }: { params: { id: string; round: string } }) {
  const { id, round } = params;
  const tournamentName = await getTournamentName(id);
  const label = `Reaches of ${humanize(String(round))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const { id, round } = params;
  const tournamentName = await getTournamentName(id);
  const label = `Most ${getRoundFullName(String(round))} Appearances at ${tournamentName}`;

  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <ViewRecordsCTA id={id} />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{label}</h1>
        <RoundFull id={id} round={round} />
      </main>
    </div>
  );
}
