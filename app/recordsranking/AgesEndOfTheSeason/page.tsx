import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default async function AgesEndOfTheSeason({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'YoungestCount') return <YoungestCount searchParams={searchParams} />;
  if (sub === 'OldestTop') return <OldestTop searchParams={searchParams} />;
  if (sub === 'YoungestTop') return <YoungestTop searchParams={searchParams} />;
  return <OldestCount searchParams={searchParams} />;
}
