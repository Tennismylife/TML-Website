"use client";

import { useState, useEffect } from "react";
import StreakCount from "./Count/page";
import StreakTop from "./Top/page";

export default function Streak() {
  const [activeSubTab, setActiveSubTab] = useState<"Count" | "Top">("Count");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab === "Count" || subtab === "Top") setActiveSubTab(subtab);
  }, []);

  return (
    <div>
      {activeSubTab === "Count" && <StreakCount />}
      {activeSubTab === "Top" && <StreakTop />}
    </div>
  );
}
