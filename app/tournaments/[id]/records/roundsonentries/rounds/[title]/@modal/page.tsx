import RoundOnEntriesFull from '@/app/tournaments/[id]/records/roundsonentries/_components/RoundOnEntriesFull';

export default async function RoundModalPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return <RoundOnEntriesFull params={{ id, title }} />;
}
