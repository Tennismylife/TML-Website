import { describe, it, expect } from 'vitest';
import { resolveTourneyIds, resolveCanonicalTourneyId } from '../../lib/tournament';

describe('resolveTourneyIds', () => {
  it('maps 580 to ["580","581"]', async () => {
    const res = await resolveTourneyIds('580');
    expect(res).toEqual(['580', '581']);
  });

  it('maps 581 to ["581"] when the numeric id exists', async () => {
    const res = await resolveTourneyIds('581');
    expect(res).toEqual(['581']);
  });

  it('maps other numeric ids to single-element array', async () => {
    const res = await resolveTourneyIds('123');
    expect(res).toEqual(['123']);
  });

  it('returns null for empty param', async () => {
    const res = await resolveTourneyIds('');
    expect(res).toBeNull();
  });
});

describe('resolveCanonicalTourneyId', () => {
  it('canonicalizes 581 to 580', async () => {
    const res = await resolveCanonicalTourneyId('581');
    expect(res).toEqual('580');
  });

  it('returns same id for 580', async () => {
    const res = await resolveCanonicalTourneyId('580');
    expect(res).toEqual('580');
  });

  it('returns null for empty param', async () => {
    const res = await resolveCanonicalTourneyId('');
    expect(res).toBeNull();
  });
});
