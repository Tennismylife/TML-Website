import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  return <AgesFull id={id} section="titles" which="youngest" />;
}