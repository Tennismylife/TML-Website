import RecordsPage from "../page";

export default function RecordsCatchAllPage({
  params,
}: {
  params: Promise<{ id: string; segments?: string[] }>;
}) {
  // params è un Promise; creiamo un Promise che risolve solo con { id }
  const idPromise = params.then(p => ({ id: p.id }));
  return <RecordsPage params={idPromise} />;
}