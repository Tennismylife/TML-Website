import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { prisma } from '@/lib/prisma';

// 🧩 Estrae la prima stringa valida (ricorsivamente) da vari formati (string, array, object)
function extractFirstString(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    for (const el of field) {
      const s = extractFirstString(el);
      if (s) return s;
    }
    return '';
  }
  if (typeof field === 'object') {
    for (const v of Object.values(field)) {
      const s = extractFirstString(v);
      if (s) return s;
    }
  }
  return '';
}

// 🧩 Estrae tutte le stringhe valide (ricorsivamente) da vari formati (string, array, object)
function extractNames(field: any): string[] {
  if (!field) return [];
  if (typeof field === 'string') return [field];
  if (Array.isArray(field)) return field.flatMap(f => extractNames(f));
  if (typeof field === 'object') return Object.values(field).flatMap(v => extractNames(v));
  return [];
}

// 🧩 Normalizza nomi storici in modo sicuro
function normalizeName(name: any): string {
  const s = extractFirstString(name);
  return s
    .replace("Australian Championships", "Australian Open")
    .replace("Australia Open", "Australian Open")
    .replace("French Championships", "Roland Garros")
    .replace("British Championships", "Wimbledon")
    .replace("US Championships", "US Open")
    .trim();
}

// 🧩 Estrae superfici uniche e normalizza rimuovendo token "indoor" (preserva ordine)
function extractUniqueSurfaces(field: any): string[] {
  const raw = extractNames(field).map(s => (s || '').trim()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    let cleaned = String(s)
      .replace(/\(.*indoor.*\)/i, '')
      .replace(/\bindoor\b/ig, '')
      .replace(/[\/\(\)\[\],]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

// 🧩 Rimuove tornei duplicati in base al nome normalizzato
function uniqueByName(tournaments: any[]): any[] {
  const seen = new Set();
  return tournaments.filter(t => {
    const n = extractFirstString(t.name);
    const name = normalizeName(n);
    if (!name) return false;
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
      // ✅ Narrowing sicuro di category (supporta array/oggetti annidati)
      let category: string;
      const catValues = extractNames(t.category);
      const match = ["G", "M", "F", "O"].find(c => catValues.includes(c));
      category = match ?? "Others";

      // ✅ Name sempre in array e supporto per strutture annidate
      const nameList = Array.isArray(t.name) ? t.name : [t.name];
      const names = nameList.flatMap(n => extractNames(n));


      switch (category) {
        case "G": {
          if (!names.includes("Australian Open-2")) {
            const { indoor, ...base } = t as any;
            groups.grandSlams.push({
              ...base,
              name: names.map(normalizeName),
              surfaces: extractUniqueSurfaces(t.surfaces),
            });
          }
          break;
        }

        case "M": {
          const mastersNames = names.filter(n => typeof n === "string" && n.endsWith("Masters") && mastersOrder.includes(n));
          if (mastersNames.length > 0) {
            const { indoor, ...base } = t as any;
            groups.masters1000.push({ ...base, name: mastersNames, surfaces: extractUniqueSurfaces(t.surfaces) });
          }
          break;
        }

        case "F": {
          const { indoor, ...base } = t as any;
          groups.finals.push({ ...base, name: names.map(normalizeName), surfaces: extractUniqueSurfaces(t.surfaces) });
          break;
        }

        case "O": {
          const { indoor, ...base } = t as any;
          groups.olympics.push({ ...base, name: names.map(normalizeName), surfaces: extractUniqueSurfaces(t.surfaces) });
          break;
        }

        default: {
          const { indoor, ...base } = t as any;
          groups.others.push({ ...base, name: names.map(normalizeName), surfaces: extractUniqueSurfaces(t.surfaces) });
          break;
        }
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

    // Diagnostic: counts per group
    const counts = {
      grandSlams: groups.grandSlams.length,
      masters1000: groups.masters1000.length,
      finals: groups.finals.length,
      olympics: groups.olympics.length,
      others: groups.others.length,
    };
    console.debug('[tournaments] groups counts:', counts);

    // If nothing is returned (or nearly everything is in others), include debug info
    const totalGroups = Object.values(counts).reduce((s, v) => s + v, 0);
    if (totalGroups === 0 || counts.others / Math.max(1, totalGroups) > 0.95) {
      const sampleCats = (tournaments || []).slice(0, 10).map(t => ({ id: t.id, atp_category: t.category, name: t.name }));
      return NextResponse.json({ groups, debug: { counts, sample: (tournaments || []).slice(0, 10), sampleCategories: sampleCats } }, { status: 200 });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("❌ Errore nel recupero dei tornei:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
