
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

type SurfaceRaw = string | null;
type SurfaceKey = "hard" | "clay" | "grass" | "carpet" | "unknown";

// Sigla standard per Slam (con AO-1/AO-2 per il 1977)
type SlamCode = "AO" | "RG" | "WIM" | "USO" | "AO-1" | "AO-2";

type WinnerObj = {
  code: SlamCode;          // AO, RG, WIM, USO (oppure AO-1/AO-2 nel 1977)
  tourney_date: string;    // ISO YYYY-MM-DD (derivata da Date)
  winner_id: string | number;
  winner_name: string;
  winner_ioc: string | null;
};

const SURFACE_MAP: Record<string, SurfaceKey> = {
  HARD: "hard",
  CLAY: "clay",
  GRASS: "grass",
  CARPET: "carpet",
  UNKNOWN: "unknown",
};

function normalizeSurface(surface: SurfaceRaw): SurfaceKey {
  const key = (surface ?? "Unknown").trim().toUpperCase();
  return SURFACE_MAP[key] ?? "unknown";
}

// Base: nome torneo -> sigla Slam (case-insensitive)
const NAME_TO_CODE_BASE: Record<string, Exclude<SlamCode, "AO-1" | "AO-2">> = {
  "AUSTRALIAN OPEN": "AO",
  "ROLAND GARROS": "RG",
  "FRENCH OPEN": "RG",
  "WIMBLEDON": "WIM",
  "US OPEN": "USO",
};

// Mese (UTC) da Date -> valore 1..12
function getUtcMonth1to12(date: Date): number {
  return date.getUTCMonth() + 1; // 0-based -> 1..12
}

// Determina la sigla Slam, gestendo AO sdoppiato nel 1977 usando la Date
function resolveSlamCode(
  tourney_name: string | null,
  year: number,
  tourney_date: Date
): SlamCode | null {
  if (!tourney_name) return null;
  const name = tourney_name.trim().toUpperCase();

  // Caso speciale 1977: due Australian Open
  if (year === 1977) {
    if (name.includes("AUSTRALIAN OPEN-1") || name.includes("AUSTRALIAN OPEN 1")) {
      return "AO-1";
    }
    if (name.includes("AUSTRALIAN OPEN-2") || name.includes("AUSTRALIAN OPEN 2")) {
      return "AO-2";
    }
    if (name === "AUSTRALIAN OPEN") {
      const mm = getUtcMonth1to12(tourney_date);
      // Gennaio (o Febbraio per sicurezza) -> AO-1 | Dicembre -> AO-2
      if (mm <= 2) return "AO-1";
      if (mm === 12) return "AO-2";
      // In casi anomali (es. marzo/novembre), non assegnare
      return null;
    }
  }

  // Anni normali
  return NAME_TO_CODE_BASE[name] ?? null;
}

export async function GET() {
  try {
    /* 1) Conteggi tornei unici per superficie/anno (efficiente) */
    const grouped = await prisma.match.groupBy({
      by: ["year", "surface", "tourney_id"],
      where: {
        team_event: false,
        year: { not: null },
        tourney_id: { not: null },
      },
    });

    const seasonsSurfaceMap = new Map<number, Map<SurfaceKey, number>>();
    for (const row of grouped) {
      const year = row.year as number;
      const surfaceKey = normalizeSurface(row.surface as SurfaceRaw);
      if (!seasonsSurfaceMap.has(year)) seasonsSurfaceMap.set(year, new Map());
      const yearMap = seasonsSurfaceMap.get(year)!;
      yearMap.set(surfaceKey, (yearMap.get(surfaceKey) ?? 0) + 1);
    }

    /* 2) Finali Slam con vincitori + tourney_date (Date) per ordinamento */
    const slamFinals = await prisma.match.findMany({
      where: {
        team_event: false,
        year: { not: null },
        tourney_level: "G",  // Grand Slam
        round: "F",  // Finale
      },
      select: {
        year: true,
        tourney_name: true,
        tourney_date: true,   // <-- Date (Prisma DateTime)
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
      },
      orderBy: [{ year: "asc" }, { tourney_date: "asc" }],
    });

    // anno -> array cronologico di WinnerObj
    const seasonsSlamWinners = new Map<number, WinnerObj[]>();

    for (const f of slamFinals) {
      const year = f.year as number;
      const date = f.tourney_date as Date;
      const code = resolveSlamCode(f.tourney_name, year, date);
      if (!code) continue;

      const entry: WinnerObj = {
        code,
        // ISO YYYY-MM-DD (UTC) per compatibilità e assenza di offset locale
        tourney_date: date.toISOString().slice(0, 10),
        winner_id: f.winner_id as any,
        winner_name: f.winner_name as string,
        winner_ioc: (f.winner_ioc as string | null) ?? null,
      };

      if (!seasonsSlamWinners.has(year)) seasonsSlamWinners.set(year, []);
      seasonsSlamWinners.get(year)!.push(entry);
    }

    // Sort difensivo (già ordinati dal DB) per sicurezza
    for (const [year, arr] of seasonsSlamWinners) {
      arr.sort((a, b) => (a.tourney_date > b.tourney_date ? 1 : a.tourney_date < b.tourney_date ? -1 : 0));
      seasonsSlamWinners.set(year, arr);
    }

    /* 3) Merge in payload per anno */
    const years = Array.from(new Set([...seasonsSurfaceMap.keys(), ...seasonsSlamWinners.keys()]))
      .sort((a, b) => a - b);

    const seasons = years.map((year) => {
      const surfaceMap = seasonsSurfaceMap.get(year) ?? new Map<SurfaceKey, number>();
      const slamArr = seasonsSlamWinners.get(year) ?? [];

      return {
        year,
        surfaces: {
          hard: surfaceMap.get("hard") ?? 0,
          grass: surfaceMap.get("grass") ?? 0,
          clay: surfaceMap.get("clay") ?? 0,
          carpet: surfaceMap.get("carpet") ?? 0,
          unknown: surfaceMap.get("unknown") ?? 0, // rimuovi se non ti serve
        },
        // Array già cronologico (AO / RG / WIM / USO; nel 1977 AO-1 / AO-2)
        slam_winners: slamArr,
      };
    });

    return NextResponse.json(seasons, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("Error fetching seasons data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
