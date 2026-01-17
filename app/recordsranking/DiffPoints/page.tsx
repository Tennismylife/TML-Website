import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const sub = Array.isArray(sp.subtab) ? sp.subtab[0] : (sp.subtab as string | undefined) ?? null;
  return { title: sub === 'EndOfTheSeason' ? 'Year‑End Difference Between No. 1 and No. 2 | ATP Ranking Records' : 'Maximum Difference Between No. 1 and No. 2 | ATP Ranking Records' };
}

export default async function DiffPoints({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'EndOfTheSeason') return <EndOfTheSeason searchParams={searchParams} />;
  return <Overall searchParams={searchParams} />;
}
