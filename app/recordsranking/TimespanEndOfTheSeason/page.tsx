import TimespanCountEndOfTheSeason from "./TimespanCountEndOfTheSeason/page";
import TimespanTopEndOfTheSeason from "./TimespanTopEndOfTheSeason/page";

export default function TimespanEndOfTheSeason({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'Top') return <TimespanTopEndOfTheSeason />;
  return <TimespanCountEndOfTheSeason />;
}
