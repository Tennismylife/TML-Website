import RoundFull from '../_components/RoundFull';

export default async function Page({ params }: any) {
  const { id, round } = params;
  return <RoundFull id={id} round={round} />;
}
