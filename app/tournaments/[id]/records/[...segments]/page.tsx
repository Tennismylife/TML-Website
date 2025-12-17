import RecordsPage from "../page";

export default function RecordsCatchAllPage({ params }: { params: { id: string; segments?: string[] } }) {
  // Rende la page esistente; il client component legge pathname e seleziona tab/subtab corretti
  return <RecordsPage params={Promise.resolve({ id: params.id })} />;
}