import React from "react";
import SeasonRecordsPage from "../page";

export default function RecordsTabPage({ params }: { params: { year: string; tab: string } }) {
  // Reuse the existing client page; it reads the pathname on the client and will detect the tab segment
  return <SeasonRecordsPage params={Promise.resolve({ year: params.year })} />;
}
