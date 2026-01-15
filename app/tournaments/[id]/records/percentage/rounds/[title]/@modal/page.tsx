import PercentageFull from '@/app/tournaments/[id]/records/percentage/_components/PercentageFull';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return <PercentageFull id={id} section="rounds" title={title} />;
}