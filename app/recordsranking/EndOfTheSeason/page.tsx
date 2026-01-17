import Count from "./Count/page";
import Top from "./Top/page";
import StreakCount from "./StreakCount/page";
import StreakTop from "./StreakTop/page";
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Seasons at Year-End | ATP Ranking Records' };

export default async function EndSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <Top searchParams={searchParams} />;
  if (sub === 'StreakCount') return <StreakCount searchParams={searchParams} />;
  if (sub === 'StreakTop') return <StreakTop searchParams={searchParams} />;
  return <Count searchParams={searchParams} />;
}
