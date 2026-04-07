import { getPlayerHref } from '@/lib/utils';

const KNOWN_SURFACES = new Set(['hard', 'clay', 'grass', 'carpet']);

/**
 * Like playerMatchesUrl but redirects to /players/slug/surface when a single surface is filtered.
 * extra.surface can be a string ('Clay') or a single-element array (['Clay']).
 */
export function playerSurfaceOrMatchesUrl(
  playerId: string,
  extra?: Record<string, string | number | boolean | string[]>
): string {
  const surfaceVal = extra?.['surface'];
  if (surfaceVal) {
    const asArray = Array.isArray(surfaceVal) ? surfaceVal : [String(surfaceVal)];
    if (asArray.length === 1 && KNOWN_SURFACES.has(asArray[0].toLowerCase())) {
      return `${getPlayerHref(String(playerId))}/${asArray[0].toLowerCase()}`;
    }
  }
  return playerMatchesUrl(playerId, extra);
}

/**
 * Returns /players/slug/surface if surface is a known single surface, else /players/slug/matches.
 */
export function playerSurfaceHref(playerId: string, surface: string | null | undefined): string {
  if (surface && KNOWN_SURFACES.has(surface.toLowerCase())) {
    return `${getPlayerHref(String(playerId))}/${surface.toLowerCase()}`;
  }
  return `${getPlayerHref(String(playerId))}/matches`;
}

/**
 * Extracts a single surface string from a Set or array; returns null when 0 or 2+ surfaces are selected.
 */
export function surfaceFromSelection(sel: Set<string> | string[] | null | undefined): string | null {
  if (!sel) return null;
  const arr = Array.isArray(sel) ? sel : [...sel];
  return arr.length === 1 ? arr[0] : null;
}

export function playerUrl(playerId: string, params?: Record<string, string | number | boolean | string[]>) {
  const id = String(playerId);
  const qs = new URLSearchParams();
  let tabSegment: string | null = null;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'tab') {
        tabSegment = String(v);
        return;
      }
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
      else qs.set(k, String(v));
    });
  }
  const q = qs.toString();
  return `${getPlayerHref(id)}${tabSegment ? `/${encodeURIComponent(tabSegment)}` : ''}${q ? `?${q}` : ""}`;
}

export function playerMatchesUrl(playerId: string, extra?: Record<string, string | number | boolean | string[]>) {
  return playerUrl(playerId, { tab: "matches", ...(extra || {}) });
}

export function playerTournamentsUrl(playerId: string, extra?: Record<string, string | number | boolean | string[]>) {
  return playerUrl(playerId, { tab: "tournaments", ...(extra || {}) });
}
