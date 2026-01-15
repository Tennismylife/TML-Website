import React from "react";
import SeasonRecordsPage from "../page";

export default async function RecordsTabPage({ params }: { params: Promise<{ year: string; tab: string }> }) {
  // Reuse the existing client page; it reads the pathname on the client and will detect the tab segment
  const p = await params
  return <SeasonRecordsPage params={Promise.resolve({ year: p.year })} />;
}
