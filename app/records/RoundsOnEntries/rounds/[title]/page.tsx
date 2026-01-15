import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

export default async function RoundPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;
  // Render the server wrapper with the selected round so direct visits show full page
  return <RoundsOnEntriesServer searchParams={{ round: title }} />;
}
