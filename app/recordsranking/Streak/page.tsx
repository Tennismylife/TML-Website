import StreakCount from "./Count/page";
import StreakTop from "./Top/page";

export default async function Streak({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <StreakTop searchParams={searchParams} />;
  return <StreakCount searchParams={searchParams} />;
}
