import TimespanCount from "./TimespanCount/page";
import TimespanTop from "./TimespanTop/page";

export default function Timespan({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'Top') return <TimespanTop />;
  return <TimespanCount />;
}
