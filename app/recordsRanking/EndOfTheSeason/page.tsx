"use client";

import { useState, useEffect } from "react";
import Count from "./Count/page";
import Top from "./Top/page";
import StreakCount from "./StreakCount/page";
import StreakTop from "./StreakTop/page";

export default function EndSeason() {
  const [activeSubTab, setActiveSubTab] = useState<"Count" | "Top" | "StreakCount" | "StreakTop">("Count");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab === "Count" || subtab === "Top" || subtab === "StreakCount" || subtab === "StreakTop") {
      setActiveSubTab(subtab);
    }
  }, []);

  return (
    <div>
      {activeSubTab === "Count" && <Count />}
      {activeSubTab === "Top" && <Top />}
      {activeSubTab === "StreakCount" && <StreakCount />}
      {activeSubTab === "StreakTop" && <StreakTop />}
    </div>
  );
}
