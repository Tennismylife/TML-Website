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
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
    expect(meta.twitter?.card).toBe('summary_large_image');
  });

  it('ages tab title and image', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages'] } });
    expect(meta.title).toBe('Australian Open | Ages');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
  });

  it('ages winners subtab title and image', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'winners'] } });
    expect(meta.title).toBe('Australian Open | Ages — Winners');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
  });

  it('ages titles youngest deep path returns specific title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'titles', 'youngest'] } });
    expect(meta.title).toBe('Youngest Title Winners at Australian Open | Tennis Records');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
  });

  it('page-level generateMetadata for ages/titles/youngest returns specific title', async () => {
    // import the page directly to test its generateMetadata
    const page = await import('@/app/tournaments/[id]/records/ages/titles/youngest/page');
    const meta = await page.generateMetadata({ params: { id: 'australian-open' } });
    expect(meta.title).toBe('Youngest Title Winners at Australian Open | Tennis Records');
  });

  it('ages titles oldest deep path returns specific title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'titles', 'oldest'] } });
    expect(meta.title).toBe('Oldest Title Winners at Australian Open | Tennis Records');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
  });

  it('page-level generateMetadata for ages/titles/oldest returns specific title', async () => {
    const page = await import('@/app/tournaments/[id]/records/ages/titles/oldest/page');
    const meta = await page.generateMetadata({ params: { id: 'australian-open' } });
    expect(meta.title).toBe('Oldest Title Winners at Australian Open | Tennis Records');
  });

  it('page-level generateMetadata for ages/youngestrounds/F returns correct title', async () => {
    const page = await import('@/app/tournaments/[id]/records/[...segments]/page');
    const meta = await page.generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'youngestrounds', 'F'] } });
    expect(meta.title).toBe('Youngest Players in F at Australian Open | Tennis Records');
  });
});