import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/records/[...slug]/page';

describe('records generateMetadata robots', () => {
  it('allows indexing for record page without filters', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: ['same', 'wins'] }), searchParams: Promise.resolve({}) } as any);
    expect(meta.robots).toBeDefined();
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it('noindex but still follow (crawlable) when non-whitelisted filters are present', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: ['same', 'wins'] }), searchParams: Promise.resolve({ surface: ['Hard'], level: ['G'] }) } as any);
    expect(meta.robots).toBeDefined();
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('allows indexing for top-level records with no params', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: [] }), searchParams: Promise.resolve({}) } as any);
    expect(meta.robots).toBeDefined();
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });
});