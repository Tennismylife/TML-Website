import TimespanCountEndOfTheSeason from "./TimespanCountEndOfTheSeason/page";
import TimespanTopEndOfTheSeason from "./TimespanTopEndOfTheSeason/page";
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Timespan (EOY) | ATP Ranking Records' };

export default async function TimespanEndOfTheSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <TimespanTopEndOfTheSeason searchParams={searchParams} />;
  return <TimespanCountEndOfTheSeason searchParams={searchParams} />;
}
