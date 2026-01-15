import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id } = p;
  // Render server ages full for youngestrounds as modal content
  return <AgesFull id={id} section="youngestrounds" />;
}