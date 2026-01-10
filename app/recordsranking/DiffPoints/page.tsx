import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export default function DiffPoints({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'EndOfTheSeason') return <EndOfTheSeason />;
  return <Overall />;
}
