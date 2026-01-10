import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default function AgesEndOfTheSeason({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sub = (searchParams?.subtab as string) ?? null;
  if (sub === 'YoungestCount') return <YoungestCount />;
  if (sub === 'OldestTop') return <OldestTop />;
  if (sub === 'YoungestTop') return <YoungestTop />;
  return <OldestCount />;
}
