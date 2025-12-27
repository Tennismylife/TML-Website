type TournamentHeader = {
  id: number;
  name: string;
  slug?: string;
  [k: string]: any;
};

const cache = new Map<string, Promise<TournamentHeader>>();

export function fetchTournamentHeaderCached(idOrSlug: string): Promise<TournamentHeader> {
  if (cache.has(idOrSlug)) return cache.get(idOrSlug)!;

  const p = (async () => {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(idOrSlug)}/header`);
    if (!res.ok) throw new Error('Failed to fetch tournament header: ' + res.status);
    const data = await res.json();
    return data as TournamentHeader;
  })();

  cache.set(idOrSlug, p);
  return p;
}

export function getTournamentHeaderCached(idOrSlug: string) {
  const p = cache.get(idOrSlug);
  if (!p) return null;
  // This returns the promise — caller can await it.
  return p;
}