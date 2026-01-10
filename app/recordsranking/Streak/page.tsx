import StreakCount from "./Count/page";
import StreakTop from "./Top/page";

export default function Streak({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'Top') return <StreakTop searchParams={searchParams} />;
  return <StreakCount searchParams={searchParams} />;
}
