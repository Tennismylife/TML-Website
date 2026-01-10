import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default function Ages({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const subtab = (searchParams?.subtab as string | undefined) ?? 'OldestCount';

  return (
    <div>
      {subtab === "OldestCount" && <OldestCount />}
      {subtab === "YoungestCount" && <YoungestCount />}
      {subtab === "OldestTop" && <OldestTop />}
      {subtab === "YoungestTop" && <YoungestTop />}
    </div>
  );
}
