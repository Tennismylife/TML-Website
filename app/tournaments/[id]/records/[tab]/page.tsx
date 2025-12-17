import RecordsPage from "../page";

export default function RecordsTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const idPromise = params.then(p => ({ id: p.id }));
  return <RecordsPage params={idPromise} />;
}