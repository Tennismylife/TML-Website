import { describe, it, expect } from 'vitest';
import { createH2HUrl } from '@/lib/utils';

describe('createH2HUrl', () => {
  it('returns canonical alphabetical URL regardless of selection order', () => {
    expect(createH2HUrl('Andrea', 'Valerio')).toBe('/h2h/andrea-vs-valerio');
    expect(createH2HUrl('Valerio', 'Andrea')).toBe('/h2h/andrea-vs-valerio');

    expect(createH2HUrl('Roger Federer', 'Rafael Nadal')).toBe('/h2h/rafael-nadal-vs-roger-federer');
    expect(createH2HUrl('Rafael Nadal', 'Roger Federer')).toBe('/h2h/rafael-nadal-vs-roger-federer');
  });
});