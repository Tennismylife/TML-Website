import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';

export default async function RoundModalPage({ params }: { params: Promise<{ id: string; title: string }> }) {
  const { id, title } = await params;
  return <TimespanFull id={id} title={title} section="rounds" />;
}
