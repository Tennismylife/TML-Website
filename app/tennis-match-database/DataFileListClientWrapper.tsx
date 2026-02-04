"use client";

import dynamic from "next/dynamic";

const DataFileListClient = dynamic(
  () => import("@/components/DataFileListClient"),
  { ssr: false, loading: () => <div>Loading files…</div> }
);

export default function DataFileListClientWrapper({ full }: { full?: boolean }) {
  return <DataFileListClient full={full} />;
}
