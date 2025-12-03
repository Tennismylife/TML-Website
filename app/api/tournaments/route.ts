import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { prisma } from '@/lib/prisma';

// 🧩 Type guard: controlla se un valore è un array di stringhe
function isStringArray(value: JsonValue): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === "string");
}

// 🧩 Normalizza nomi storici
function normalizeName(name: string): string {
  return name
    .replace("Australian Championships", "Australian Open")
    .replace("Australia Open", "Australian Open")
    .replace("French Championships", "Roland Garros")
    .replace("British Championships", "Wimbledon")
    .replace("US Championships", "US Open")
    .trim();
}

// 🧩 Rimuove tornei duplicati in base al nome normalizzato
function uniqueByName(tournaments: any[]): any[] {
  const seen = new Set();
  return tournaments.filter(t => {
    const n = Array.isArray(t.name) ? t.name[0] : t.name;
    const name = normalizeName(n);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { id: "asc" },
    });

    const groups = {
      grandSlams: [] as any[],
      masters1000: [] as any[],
      finals: [] as any[],
      olympics: [] as any[],
      others: [] as any[],
    };

    const mastersOrder = [
      "Indian Wells Masters",
      "Miami Masters",
      "Monte Carlo Masters",
      "Madrid Masters",
      "Rome Masters",
      "Canada Masters",
      "Cincinnati Masters",
      "Shanghai Masters",
      "Paris Masters",
    ];

    for (const t of tournaments) {
      // ✅ Narrowing sicuro di category
      let category: string;
      if (isStringArray(t.category)) {
        const cat = t.category as string[];
        const match = ["G", "M", "F", "O"].find(c => cat.includes(c));
        category = match ?? "Others";
      } else if (typeof t.category === "string") {
        category = t.category;
      } else {
        category = "Others";
      }

      // ✅ Name sempre in array
      const nameList = Array.isArray(t.name) ? t.name : [t.name];

      switch (category) {
        case "G":
          if (!nameList.includes("Australian Open-2")) {
            groups.grandSlams.push({
              ...t,
              name: nameList.map(normalizeName),
            });
          }
          break;

        case "M":
          const mastersNames = nameList.filter(
            n =>
              typeof n === "string" &&
              n.endsWith("Masters") &&
              mastersOrder.includes(n)
          );
          if (mastersNames.length > 0) {
            groups.masters1000.push({ ...t, name: mastersNames });
          }
          break;

        case "F":
          groups.finals.push({ ...t, name: nameList.map(normalizeName) });
          break;

        case "O":
          groups.olympics.push({ ...t, name: nameList.map(normalizeName) });
          break;

        default:
          groups.others.push({ ...t, name: nameList.map(normalizeName) });
          break;
      }
    }

    // ✅ Ordina e rimuove duplicati
    const slamOrder = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"];

    groups.grandSlams = uniqueByName(groups.grandSlams).sort((a, b) => {
      const aName = normalizeName(Array.isArray(a.name) ? a.name[0] : a.name);
      const bName = normalizeName(Array.isArray(b.name) ? b.name[0] : b.name);
      return slamOrder.indexOf(aName) - slamOrder.indexOf(bName);
    });

    groups.masters1000 = uniqueByName(groups.masters1000).sort((a, b) => {
      const aName = Array.isArray(a.name) ? a.name[0] : a.name;
      const bName = Array.isArray(b.name) ? b.name[0] : b.name;
      return mastersOrder.indexOf(aName) - mastersOrder.indexOf(bName);
    });

    groups.finals = uniqueByName(groups.finals);
    groups.olympics = uniqueByName(groups.olympics);
    groups.others = uniqueByName(groups.others);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("❌ Errore nel recupero dei tornei:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
