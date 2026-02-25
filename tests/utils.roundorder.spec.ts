import { describe, it, expect } from 'vitest';
import { ROUND_ORDER, getRoundIndex } from '../lib/utils';

describe('round order utility', () => {
  it('returns correct indexes for standard rounds', () => {
    ROUND_ORDER.forEach((r, idx) => {
      expect(getRoundIndex(r, null)).toBe(idx);
    });
  });

  it('places RR before SF and F for F-level tournaments', () => {
    expect(getRoundIndex('RR', 'F')).toBeLessThan(getRoundIndex('SF', 'F'));
    expect(getRoundIndex('SF', 'F')).toBeLessThan(getRoundIndex('F', 'F'));
  });

  it('pushes QF after F when tourney_level is F', () => {
    const qfIdx = getRoundIndex('QF', 'F');
    const fIdx = getRoundIndex('F', 'F');
    expect(qfIdx).toBeGreaterThan(fIdx);
    // also ensure normal rounds still have an index
    expect(getRoundIndex('R16', 'F')).toBeLessThan(qfIdx);
  });

  it('returns large value for unknown rounds', () => {
    expect(getRoundIndex('XYZ', null)).toBeGreaterThan(ROUND_ORDER.length);
    expect(getRoundIndex(null, 'F')).toBeGreaterThan(ROUND_ORDER.length);
  });
});
