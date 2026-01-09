"use client";

import { useState, useEffect } from "react";
import TimespanCountEndOfTheSeason from "./TimespanCountEndOfTheSeason/page";
import TimespanTopEndOfTheSeason from "./TimespanTopEndOfTheSeason/page";

export default function TimespanEndOfTheSeason() {
  const [activeSubTab, setActiveSubTab] = useState<"Count" | "Top">("Count");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab === "Count" || subtab === "Top") {
      setActiveSubTab(subtab);
    }
  }, []);

  return (
    <div>
      {activeSubTab === "Count" && <TimespanCountEndOfTheSeason />}
      {activeSubTab === "Top" && <TimespanTopEndOfTheSeason />}
    </div>
  );
}
