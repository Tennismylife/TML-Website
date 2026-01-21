import RoundFull from '../_components/RoundFull';
import { getTournamentName, makeTitle, humanize } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import { getRoundFullName } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ id: string; round: string }> }) {
  const { id, round } = await params;
  const tournamentName = await getTournamentName(id);
  const label = `Reaches of ${humanize(String(round))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: { params: Promise<{ id: string; round: string }> }) {
  const { id, round } = await params;
  console.log('Rendering rounds page for id:', id, 'round:', round);
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    tournamentName = await getTournamentName(id);
  } catch (e) {
    console.log('Error getting tournament name:', e);
  }
  const roundName = getRoundFullName(String(round));
  const label = `Most ${roundName} Appearances at ${tournamentName}`;

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
