import AgesSection from '@/app/tournaments/[id]/records/AgesSection';

export default async function ModalPage({ params }: any) {
  const p = await params;
  const { id } = p;
  // Render client ages section inside server modal route so direct @modal URLs hydrate to the same client UI
  // @ts-ignore - client component
  return <AgesSection id={id} linkId={id} activeSubTab="titles" />;
}
