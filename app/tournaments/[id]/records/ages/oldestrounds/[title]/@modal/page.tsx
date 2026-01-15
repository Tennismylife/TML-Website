import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return <AgesFull id={id} section="oldestrounds" title={title} />;
}