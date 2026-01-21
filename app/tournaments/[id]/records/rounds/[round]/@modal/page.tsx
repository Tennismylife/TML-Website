import RoundFull from '../../_components/RoundFull';

export default async function ModalPage({ params }: any) {
  const { id, round } = params;
  return <RoundFull id={id} round={round} />;
}
