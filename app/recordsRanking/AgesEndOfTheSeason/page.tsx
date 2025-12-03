"use client";

import { useState, useEffect } from "react";
import OldestCount from "./OldestCount/page";
import YoungestCount from "./YoungestCount/page";
import OldestTop from "./OldestTop/page";
import YoungestTop from "./YoungestTop/page";

export default function AgesEndOfTheSeason() {
  const [activeSubTab, setActiveSubTab] = useState<"OldestCount" | "YoungestCount" | "OldestTop" | "YoungestTop">("OldestCount");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab === "OldestCount" || subtab === "YoungestCount" || subtab === "OldestTop" || subtab === "YoungestTop") {
      setActiveSubTab(subtab);
    }
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
