"use client";

import { useState, useEffect } from "react";
import Overall from "./Overall/page";
import EndOfTheSeason from "./EndOfTheSeason/page";

export default function MostPoints() {
  const [activeSubTab, setActiveSubTab] = useState<"Overall" | "EndOfTheSeason">("Overall");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab === "Overall" || subtab === "EndOfTheSeason") {
      setActiveSubTab(subtab);
    }
  }, []);

  return (
    <div>
      {activeSubTab === "Overall" && <Overall />}
      {activeSubTab === "EndOfTheSeason" && <EndOfTheSeason />}
    </div>
  );
}
