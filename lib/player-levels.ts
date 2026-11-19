import type { Tour } from "./tour-path";
import { getLevelFullName } from "./utils";

const wtaLevels: Record<string, string> = {
  G: "Grand Slam",
  M: "WTA 1000",
  "1000": "WTA 1000",
  "500": "WTA 500",
  "250": "WTA 250",
  "125": "WTA 125",
  F: "WTA Finals",
  D: "Billie Jean King Cup / Fed Cup",
  O: "Olympics",
  A: "Other tournaments",
  ITF: "ITF",
  P: "WTA Premier",
  I: "WTA International",
  T1: "Tier I",
  T2: "Tier II",
  T3: "Tier III",
  T4: "Tier IV",
  T5: "Tier V",
};

export function playerLevelName(level: string | null | undefined, tour: Tour, atpName?: string) {
  if (tour === "ATP") return atpName ?? getLevelFullName(level);
  const code = (level ?? "").trim().toUpperCase();
  return wtaLevels[code] ?? (level || "Unknown");
}

const levelOrder = ["G", "M", "F", "500", "250", "125", "O", "D", "A"];

export function sortPlayerLevels(levels: Iterable<string>) {
  const order = (level: string) => {
    const index = levelOrder.indexOf(level);
    return index === -1 ? levelOrder.length : index;
  };
  return [...levels].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}
