import TimespanCount from "./TimespanCount/page";
import TimespanTop from "./TimespanTop/page";

export default async function Timespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const sub = (sp.subtab as string) ?? null;
  if (sub === 'Top') return <TimespanTop searchParams={searchParams} />;
  return <TimespanCount searchParams={searchParams} />;
}
