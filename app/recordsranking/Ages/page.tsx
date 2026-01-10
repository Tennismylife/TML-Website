"use client";

"use client";

import { useState, useEffect } from "react";
import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default function Ages() {
  const [activeSubTab, setActiveSubTab] = useState<
    "YoungestCount" | "OldestCount" | "YoungestTop" | "OldestTop"
  >("OldestCount");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab") as
      | "YoungestCount"
      | "OldestCount"
      | "YoungestTop"
      | "OldestTop"
      | null;

    if (subtab) setActiveSubTab(subtab);
  }, []);

  return (
    <div>
      {activeSubTab === "OldestCount" && <OldestCount />}
      {activeSubTab === "YoungestCount" && <YoungestCount />}
      {activeSubTab === "OldestTop" && <OldestTop />}
      {activeSubTab === "YoungestTop" && <YoungestTop />}
    </div>
  );
}
