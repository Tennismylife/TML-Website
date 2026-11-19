import { playerLevelName } from "@/lib/player-levels";
import type { Tour } from "@/lib/tour-path";

export const statisticsCategoryCodes = {
  ATP: ["G", "M", "A", "D", "O"],
  WTA: ["G", "M", "500", "250", "F", "D", "O", "P", "I", "T3", "A"],
} as const;

const atpCategoryLabels: Record<string, string> = {
  G: "Grand Slam",
  M: "Masters 1000",
  A: "Others",
  C: "Challenger",
  F: "Futures",
  D: "Davis Cup",
  O: "Olympics",
};

export function statisticsCategoryLabel(code: string, tour: Tour) {
  return tour === "WTA"
    ? playerLevelName(code, tour)
    : atpCategoryLabels[code] ?? code;
}
