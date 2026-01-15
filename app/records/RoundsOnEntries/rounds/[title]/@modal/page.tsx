import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

export default async function RoundModalPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;
  // Render the server wrapper inside the modal route so direct @modal URLs hydrate to same UI
  return <RoundsOnEntriesServer searchParams={{ round: title }} />;
}
