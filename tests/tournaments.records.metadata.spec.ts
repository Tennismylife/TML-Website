import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing
vi.mock('../app/tournaments/[id]/records/layout', async () => {
  // return the real module so we can import generateMetadata after mocking prisma
  return await vi.importActual('../app/tournaments/[id]/records/layout');
});

// Mock prisma module used by layout
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      findUnique: vi.fn(async ({ where }: any) => ({ id: 1, name: 'Australian Open', slug: 'australian-open' })),
    },
  },
}));

import { generateMetadata } from '../app/tournaments/[id]/records/layout';

describe('tournaments records generateMetadata', () => {
  it('root records title and image', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } });
    expect(meta.title).toBe('Australian Open | Records');
    expect(meta.openGraph?.images?.[0]?.url).toContain('?page=records');
    expect(meta.twitter?.card).toBe('summary_large_image');
  });

  it('ages tab title and image', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages'] } });
    expect(meta.title).toBe('Australian Open | Ages');
    expect(meta.openGraph?.images?.[0]?.url).toContain('&tab=ages');
  });

  it('ages winners subtab title and image', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'winners'] } });
    expect(meta.title).toBe('Australian Open | Ages — Winners');
    expect(meta.openGraph?.images?.[0]?.url).toContain('&tab=ages');
    expect(meta.openGraph?.images?.[0]?.url).toContain('&sub=winners');
  });
});