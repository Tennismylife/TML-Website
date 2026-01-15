import RoundFull from '../_components/RoundFull';
import { getTournamentName, makeTitle, humanize } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: { id: string; round: string } }) {
  const { id, round } = params;
  const tournamentName = await getTournamentName(id);
  const label = `Reaches of ${humanize(String(round))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const { id, round } = params;
  return <RoundFull id={id} round={round} />;
}
