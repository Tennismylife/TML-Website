import StreakCount from "./Count/page";
import StreakTop from "./Top/page";
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Consecutive Weeks | ATP Ranking Records' };

export default async function Streak({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <StreakTop searchParams={searchParams} />;
  return <StreakCount searchParams={searchParams} />;
}
