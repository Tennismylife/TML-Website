import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export default async function DiffPoints({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'EndOfTheSeason') return <EndOfTheSeason searchParams={searchParams} />;
  return <Overall searchParams={searchParams} />;
}
