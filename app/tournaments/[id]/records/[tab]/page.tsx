import RecordsPage from "../page";

export default function RecordsTabPage({ params }: { params: { id: string; tab: string } }) {
  // Rende la page esistente (client) con lo stesso id;
  // il componente client legge il pathname e seleziona il tab corretto.
  return <RecordsPage params={Promise.resolve({ id: params.id })} />;
}