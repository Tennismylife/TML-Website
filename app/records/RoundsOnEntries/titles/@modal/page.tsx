import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

export default async function TitlesModalPage() {
  // Render titles server wrapper inside modal slot
  return <RoundsOnEntriesServer searchParams={{}} serverProps={{ sub: 'titles' }} />;
}
