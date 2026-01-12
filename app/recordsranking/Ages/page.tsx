import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default async function Ages({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const subtab = (sp.subtab as string | undefined) ?? 'OldestCount';

  return (
    <div>
      {subtab === "OldestCount" && <OldestCount />}
      {subtab === "YoungestCount" && <YoungestCount />}
      {subtab === "OldestTop" && <OldestTop />}
      {subtab === "YoungestTop" && <YoungestTop />}
    </div>
  );
}
