export const LEVEL_KEYS = ['G','M','F','A','250','500','D'] as const;

export const LEVEL_NAMES: Record<string, string> = {
  G: 'Grand Slam',
  M: 'Masters 1000',
  F: 'ATP Finals',
  '500': '500',
  '250': '250',
  A: 'Others',
  D: 'Davis Cup',
};

export function getLevelName(key?: string | null) {
  if (!key) return '';
  return LEVEL_NAMES[String(key)] || String(key);
}

// Return the URL-friendly param label for a given key, e.g. 'G' -> 'Grand-Slam'
export function paramLabelFromKey(key?: string | null) {
  if (!key) return '';
  const name = LEVEL_NAMES[String(key)];
  if (!name) return String(key);
  return name.replace(/\s+/g, '-');
}

// Map a level param label back to a key, e.g. 'Grand-Slam' or 'grand-slam' -> 'G'
export function keyFromParamLabel(param?: string | null) {
  if (!param) return '';
  const raw = String(param).trim();
  // If it's a single letter that matches a key, accept it
  if (raw.length === 1 && LEVEL_NAMES[raw.toUpperCase()]) return raw.toUpperCase();

  // Normalize: replace hyphens with spaces, compare case-insensitive
  const normalized = raw.replace(/-/g, ' ').trim().toLowerCase();
  for (const [k, v] of Object.entries(LEVEL_NAMES)) {
    if (String(v).toLowerCase() === normalized) return k;
  }

  // Also accept labels with spaces instead of hyphens
  for (const [k, v] of Object.entries(LEVEL_NAMES)) {
    if (String(v).toLowerCase() === raw.toLowerCase()) return k;
  }

  return '';
}
