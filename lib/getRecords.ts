export type RecordRow = Record<string, any>;

// Prefer explicit SITE_URL, otherwise default to localhost during development so local dev fetches work
const SITE_URL = process.env.SITE_URL ?? (process.env.NODE_ENV === 'development' ? `http://localhost:${process.env.PORT ?? 3000}` : 'https://stats.tennismylife.org');

/**
 * Server-side helper to fetch record data from internal API
 */
export async function getRecords(tab: string, surface?: string, round?: string): Promise<RecordRow[]> {
  if (!tab) return [];
  const base = `/api/records/${encodeURIComponent(tab)}`;
  const params = new URLSearchParams();
  if (surface) params.set('surface', String(surface));
  if (round) params.set('round', String(round));

  const path = params.toString() ? `${base}?${params.toString()}` : base;
  const url = new URL(path, SITE_URL).toString();

  try {
    // Use force-cache to make pages SSG-friendly when pre-rendered
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [];
    const json = await res.json();
    // Normalize response shapes: some endpoints return an array directly, others return an object
    // with the array nested at a property (e.g., { topWinners: [...] }). Try to extract the first array found.
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') {
      for (const key of Object.keys(json)) {
        const val = (json as any)[key];
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  } catch (err) {
    return [];
  }
}
