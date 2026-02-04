import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function normalizeTourneyKey(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function canonicalGrandSlam(name: string) {
  const key = normalizeTourneyKey(name);
  if (key.includes('australian') && (key.includes('open') || key.includes('championship'))) return 'Australian Open';
  if (key.includes('roland') || key.includes('french open')) return 'Roland Garros';
  if (key.includes('wimbledon')) return 'Wimbledon';
  if ((key.includes('us') || key.includes('u s') || key.includes('united states')) && key.includes('open')) return 'US Open';
  return name;
}

function resolveTourneyName(raw: any): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const unique = Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean)));
    if (unique.length === 0) return null;
    const joined = unique.length > 1 ? unique.join(' / ') : unique[0];
    return canonicalGrandSlam(joined);
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    const candidate = obj.en ?? Object.values(obj)[0];
    if (candidate == null) return null;
    if (Array.isArray(candidate)) {
      const unique = Array.from(new Set(candidate.map((v) => String(v ?? '').trim()).filter(Boolean)));
      if (unique.length === 0) return null;
      const joined = unique.length > 1 ? unique.join(' / ') : unique[0];
      return canonicalGrandSlam(joined);
    }
    const cleaned = String(candidate).trim();
    return cleaned ? canonicalGrandSlam(cleaned) : null;
  }
  const cleaned = String(raw).trim();
  return cleaned ? canonicalGrandSlam(cleaned) : null;
}

// Lightweight facets endpoint for player match filters
// GET /api/players/match-facets?id=PLAYER_ID
// Returns small JSON with distinct values and counts for: year, surface, tourney_level, round, tourney_id, best_of
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get('id');
  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  try {
    // Resolve slug -> numeric id when needed
    let resolvedPlayerId = playerId;
    if (!/^\d+$/.test(String(playerId))) {
      const p = await prisma.player.findUnique({ where: { slug: String(playerId).toLowerCase() }, select: { id: true } });
      if (p?.id) resolvedPlayerId = String(p.id);
    }

    const where: any = { OR: [{ winner_id: resolvedPlayerId }, { loser_id: resolvedPlayerId }] };

    // Group by year
    const yearsRows = await prisma.match.groupBy({ by: ['year'], where, _count: { _all: true } });
    const years = yearsRows
      .filter(r => r.year != null)
      .map(r => ({ value: r.year as number, count: (r as any)._count?._all ?? 0 }))
      .sort((a, b) => (b.value as number) - (a.value as number));

    // Surfaces
    const surfacesRows = await prisma.match.groupBy({ by: ['surface'], where, _count: { _all: true } });
    const surfaces = surfacesRows.map(r => ({ value: r.surface ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));

    // Levels
    const levelsRows = await prisma.match.groupBy({ by: ['tourney_level'], where, _count: { _all: true } });
    const levels = levelsRows.map(r => ({ value: r.tourney_level ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));

    // Rounds
    const roundsRows = await prisma.match.groupBy({ by: ['round'], where, _count: { _all: true } });
    const rounds = roundsRows.map(r => ({ value: r.round ?? 'Unknown', count: (r as any)._count?._all ?? 0 }));

    // BestOf (best_of field)
    const bestOfRows = await prisma.match.groupBy({ by: ['best_of'], where, _count: { _all: true } });
    const bestOf = bestOfRows.map(r => ({ value: r.best_of ?? 0, count: (r as any)._count?._all ?? 0 }));

    // Tournaments (group by raw tourney_id, return id and count)
    const tourneyRows = await prisma.match.groupBy({ by: ['tourney_id'], where, _count: { _all: true } });
    // Also group by tourney_id + tourney_name to capture names as they appear in this player's matches
    const tourneyNameRows = await prisma.match.groupBy({ by: ['tourney_id', 'tourney_name'], where, _count: { _all: true } });

    // Normalize and trim empty
    const tourneyIds = tourneyRows.map(r => ({ id: String(r.tourney_id ?? '').trim(), count: (r as any)._count?._all ?? 0 })).filter(t => t.id);

    // Build name map from player's own match rows (not global tournament table)
    const nameMap = new Map<string, string[]>();
    tourneyNameRows.forEach(r => {
      const id = String(r.tourney_id ?? '').trim();
      const raw = resolveTourneyName(r.tourney_name);
      if (!id || !raw) return;
      const list = nameMap.get(id) ?? [];
      if (!list.includes(raw)) list.push(raw);
      nameMap.set(id, list);
    });

    // Resolve slugs (best-effort) by tourney id part
    const tourneyIdParts = Array.from(new Set(tourneyIds.map(t => {
      const parts = t.id.split('-').filter(Boolean);
      return parts.length === 2 ? parts[1] : t.id;
    })));

    let tourneySlugMap: Record<string, { slug?: string | null }> = {};
    try {
      if (tourneyIdParts.length > 0) {
        const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map(v => Number(v)) } }, select: { id: true, slug: true } });
        tourneySlugMap = tours.reduce((acc: Record<string, any>, t: any) => {
          acc[String(t.id)] = { slug: t.slug ?? null };
          return acc;
        }, {});
      }
    } catch (e) {
      tourneySlugMap = {};
    }

    let tourneys = tourneyIds.map(t => {
      const parts = t.id.split('-').filter(Boolean);
      const idPart = parts.length === 2 ? parts[1] : t.id;
      const names = nameMap.get(t.id) ?? [];
      const name = names.length > 1 ? names.join(' / ') : (names[0] ?? t.id);
      return {
        id: t.id,
        idPart,
        count: t.count,
        name,
        slug: idPart ? (tourneySlugMap[idPart]?.slug ?? null) : null
      };
    });

    // Ensure tourney names are unique (collapse duplicates by normalized name)
    const nameSeen = new Set<string>();
    tourneys = tourneys.filter((t) => {
      const rawName = (t.name ?? t.id).toString().trim();
      const key = rawName.replace(/\s+/g, ' ').toLowerCase();
      if (!key) return false;
      if (nameSeen.has(key)) return false;
      nameSeen.add(key);
      return true;
    });

    tourneys = tourneys.sort((a,b) => b.count - a.count).slice(0, 100); // cap result size for payload safety

    const payload = { years, surfaces, levels, rounds, tourneys, bestOf };

    // Compute lightweight ETag from payload
    const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');

    // Determine caching policy: default 1 day, 7 days for vintage players (no matches in last 3 years)
    const currentYear = new Date().getFullYear();
    const latestYear = years.length ? Math.max(...years.map(y => y.value)) : currentYear;
    const isVintage = (currentYear - latestYear) >= 3;
    const maxAge = isVintage ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // seconds

    const headers = new Headers();
    headers.set('Cache-Control', `public, max-age=${maxAge}, immutable`);
    headers.set('ETag', `"${etag}"`);

    return new NextResponse(JSON.stringify(payload), { status: 200, headers });
  } catch (err) {
    console.error('Errore facets:', err);
    return NextResponse.json({ error: 'Errore server durante il recupero dei facets' }, { status: 500 });
  }
}
