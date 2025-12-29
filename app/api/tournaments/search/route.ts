import { NextResponse } from "next/server";
import type { JsonValue } from "@prisma/client/runtime/library";
import { prisma } from '@/lib/prisma';

// Helpers copied / adapted from app/api/tournaments/route.ts
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

function extractNames(field: any): string[] {
  if (!field) return [];
  if (typeof field === 'string') return [field];
  if (Array.isArray(field)) return field.flatMap(f => extractNames(f));
  if (typeof field === 'object') return Object.values(field).flatMap(v => extractNames(v));
  return [];
}

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const limitParam = parseInt(url.searchParams.get('limit') || '8', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 8;

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const tournaments = await prisma.tournament.findMany({ orderBy: { id: 'asc' } });

    const matches = [] as any[];

    for (const t of tournaments) {
      const names = Array.isArray(t.name) ? t.name.flatMap(n => extractNames(n)) : extractNames(t.name);
      const nameStr = names.join(' ');
      const surfaces = extractUniqueSurfaces(t.surfaces || []);
      const concat = `${nameStr} ${surfaces.join(' ')}`.toLowerCase();

      if (concat.includes(q) || String(t.id).includes(q)) {
        matches.push({
          id: t.id,
          name: names.map(normalizeName),
          displayName: normalizeName(names[0] ?? ''),
          surfaces,
        });
      }
    }

    // Deduplicate by id and limit results
    const seen = new Set<number>();
    const unique = [] as any[];
    for (const m of matches) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        unique.push(m);
      }
      if (unique.length >= limit) break;
    }

    // Fetch available years for each matched tournament in parallel
    const withYears = await Promise.all(unique.map(async (m) => {
      try {
        const rows = await prisma.match.findMany({
          where: {
            OR: [
              { tourney_id: String(m.id) },
              { tourney_id: { endsWith: `-${m.id}` } }
            ],
          },
          select: { year: true },
          orderBy: { year: 'desc' },
        });
        const yearsSet = new Set<number>(rows.map(r => Number(r.year)).filter(Boolean));
        const years = Array.from(yearsSet).sort((a, b) => b - a);
        return { ...m, years };
      } catch (err) {
        return { ...m, years: [] };
      }
    }));

    return NextResponse.json({ results: withYears });
  } catch (error) {
    console.error('Error in tournaments/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
