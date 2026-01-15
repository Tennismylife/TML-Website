import PercentageSection from '@/app/tournaments/[id]/records/PercentageSection';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id } = p;
  // Render client percentage section inside server modal route so direct @modal URLs hydrate to the same client UI
  // @ts-ignore - client component
  return <PercentageSection id={id} activeSubTab="overall" />;
}