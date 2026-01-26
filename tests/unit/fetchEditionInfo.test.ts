import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and tournament helpers before importing the module under test
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      findUnique: vi.fn(),
    },
    match: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tournament', () => ({
  resolveTourneyIds: vi.fn(),
  resolveCanonicalTourneyId: vi.fn(),
}));

import { fetchEditionInfo } from '../../app/tournaments/[id]/[year]/layout';
import { prisma } from '@/lib/prisma';
import { resolveTourneyIds, resolveCanonicalTourneyId } from '@/lib/tournament';

const mockedPrisma = prisma as any;
const mockedResolveTourneyIds = resolveTourneyIds as any;
const mockedResolveCanonical = resolveCanonicalTourneyId as any;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('fetchEditionInfo', () => {
  it('returns object (hasMatches=false) when tournament exists but no matches', async () => {
    // Arrange: prisma returns a tournament row, resolveTourneyIds returns an id list, match.findFirst returns null
    mockedPrisma.tournament.findUnique.mockResolvedValue({ id: 1, slug: 'australian-open', name: 'Australian Open' });
    mockedResolveTourneyIds.mockResolvedValue(['AO']);
    mockedPrisma.match.findFirst.mockResolvedValue(null);

    // Act
    const info = await fetchEditionInfo({ id: 'australian-open', year: '1971' });

    // Assert
    expect(info).not.toBeNull();
    expect(info?.tourneyRow).toBeDefined();
    expect(info?.tourneyIds).toEqual(['AO']);
    expect(info?.hasMatches).toBe(false);
  });

  it('returns null when tournament slug cannot be resolved', async () => {
    // Arrange: prisma returns null
    mockedPrisma.tournament.findUnique.mockResolvedValue(null);

    // Act
    const info = await fetchEditionInfo({ id: 'nonexistent', year: '1971' });

    // Assert
    expect(info).toBeNull();
  });

  it('handles numeric id by resolving canonical id', async () => {
    // Arrange: numeric id given, resolveCanonicalTourneyId returns a canonical id and tournament exists
    mockedResolveCanonical.mockResolvedValue('42');
    mockedPrisma.tournament.findUnique.mockResolvedValue({ id: 42, slug: 'canon-slug', name: 'Canonical' });
    mockedResolveTourneyIds.mockResolvedValue(['C42']);
    mockedPrisma.match.findFirst.mockResolvedValue(null);

    // Act
    const info = await fetchEditionInfo({ id: '123', year: '1980' });

    // Assert
    expect(info).not.toBeNull();
    expect(info?.tourneyRow?.slug).toBe('canon-slug');
    expect(info?.hasMatches).toBe(false);
  });
});
