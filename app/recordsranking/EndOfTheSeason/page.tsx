import Count from "./Count/page";
import Top from "./Top/page";
import StreakCount from "./StreakCount/page";
import StreakTop from "./StreakTop/page";

export default function EndSeason({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'Top') return <Top />;
  if (sub === 'StreakCount') return <StreakCount />;
  if (sub === 'StreakTop') return <StreakTop />;
  return <Count />;
}
