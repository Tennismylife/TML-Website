import { describe, it, expect } from 'vitest';
import { generateRecordLink } from '../lib/recordsLinks';

describe('generateRecordLink', () => {
  it('builds canonical path with subtab and filters', () => {
    const href = generateRecordLink('ages', 'oldest', { surface: 'Grass' });
    expect(href).toBe('/records/ages/oldest?surface=Grass');
  });

  it('builds record-only path without subtab', () => {
    const href = generateRecordLink('wins');
    expect(href).toBe('/records/wins');
  });
});