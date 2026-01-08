export type RecordRow = Record<string, any>;

const SITE_URL = process.env.SITE_URL || 'https://stats.tennismylife.org';

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
    return Array.isArray(json) ? json : [];
  } catch (err) {
    return [];
  }
}
