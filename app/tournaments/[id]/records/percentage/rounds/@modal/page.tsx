import PercentageSection from '@/app/tournaments/[id]/records/PercentageSection';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id } = p;
  // @ts-ignore - client component
  return <PercentageSection id={id} activeSubTab="rounds" />;
}