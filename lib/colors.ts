// lib/colors.ts

/** 🎨 Palette colori per turni (rounds) */
export const roundColors: Record<string, string> = {
  Unknown: "#9CA3AF",
  Q1: "#EF4444",
  Q2: "#F87171",
  Q3: "#DC2626",
  R256: "#3B82F6",
  R128: "#60A5FA",
  R64: "#2563EB",
  R32: "#22C55E",
  R16: "#4ADE80",
  RR: "#FBBF24",
  QF: "#8B5CF6",
  SF: "#A855F7",
  F: "#10B981",
  W: "#F59E0B",
  BR: "#06B6D4",
};

/** 🎨 Palette colori generici */
export const palette: string[] = [
  "#3B82F6", // blu - hard / neutro
  "#22C55E", // verde - grass / successi
  "#EF4444", // rosso - clay / sconfitte
  "#FBBF24", // giallo - carpet / warning
  "#A855F7", // viola - grand slam
  "#06B6D4", // ciano - masters
  "#F59E0B", // arancio - futures / itf
  "#9CA3AF", // grigio - default / sconosciuto
];


/** 🔵 Colore del round */
export function getRoundColor(round: unknown): string {
  if (Array.isArray(round)) round = round.at(-1); // prendi l’ultimo se è array
  if (typeof round !== "string") return roundColors["Unknown"];
  return roundColors[round] ?? roundColors["Unknown"];
}

/** 🌗 Calcola luminanza per contrasto testo */
function getLuminance(hex: string): number {
  const rgb =
    hex
      .replace("#", "")
      .match(/.{2}/g)
      ?.map((c) => parseInt(c, 16) / 255) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 🧾 Colore testo leggibile per un dato background */
export function getTextColorForRound(color: unknown): string {
  if (typeof color !== "string" || !color.startsWith("#")) return "#FFFFFF";
  const luminance = getLuminance(color);
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
}

/** 🟩 Colori per superficie */
export function getSurfaceColor(surface: unknown): string {
  if (Array.isArray(surface)) surface = surface.at(-1); // ultima superficie
  if (typeof surface !== "string") return "#9CA3AF";

  const s = surface.toLowerCase().trim();

  switch (s) {
    case "hard":
      return "#3B82F6";
    case "clay":
      return "#EF4444";
    case "grass":
      return "#22C55E";
    case "carpet":
      return "#FBBF24";
    default:
      return "#9CA3AF";
  }
}

/** 🏆 Colori per livello torneo */

export function getLevelColor(level: unknown): string {
  const DEFAULT = "#9CA3AF";       // Gray-400
  const GRAND_SLAM = "#A855F7";    // Violet-500
  const MASTERS_1000 = "#06B6D4";  // Cyan-500
  const ATP = "#354C75";           // Navy
  const ATP_FINALS = "#F43F5E";    // Rose-500 (Finals)

  if (Array.isArray(level)) {
    level = level.filter(Boolean).at(-1) ?? "";
  }

  if (level == null) return DEFAULT;

  const l = String(level).toLowerCase().trim();

  if (/grand slam|slam|g(?:asters)?/.test(l)) return GRAND_SLAM; // Grand Slam
  if (/finals|f(?:asters)?/.test(l)) return ATP_FINALS; // Finals
  if (/masters|masters 1000|m(?:asters)?/.test(l)) return MASTERS_1000; // Masters 1000
  if (/(250|500)?|^atp\b/.test(l)) return ATP; // ATP

  return DEFAULT;
}
