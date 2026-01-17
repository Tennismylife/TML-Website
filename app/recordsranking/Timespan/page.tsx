import TimespanCount from "./TimespanCount/page";
import TimespanTop from "./TimespanTop/page";
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Timespan Records | ATP Ranking Records' };

export default async function Timespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <TimespanTop searchParams={searchParams} />;
  return <TimespanCount searchParams={searchParams} />;
}
