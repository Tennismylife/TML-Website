import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

export default async function TitlesPage() {
  // Render titles full page
  return <RoundsOnEntriesServer searchParams={{}} serverProps={{ sub: 'titles' }} />;
}
