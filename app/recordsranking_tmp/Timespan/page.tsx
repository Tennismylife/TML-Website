"use client";

import { useState, useEffect } from "react";
import TimespanCount from "./TimespanCount/page";
import TimespanTop from "./TimespanTop/page";

export default function Timespan() {
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
      {activeSubTab === "Count" && <TimespanCount />}
      {activeSubTab === "Top" && <TimespanTop />}
    </div>
  );
}
