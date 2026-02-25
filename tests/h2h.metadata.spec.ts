vi.mock('@/lib/prisma', () => ({ prisma: { player: { findFirst: vi.fn() } } }));
vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));

import { generateMetadata } from '../app/h2h/[...slugs]/page';

describe('h2h generateMetadata', () => {
  it('layout metadata allows indexing', () => {
    const { metadata } = require('../app/h2h/layout');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
  it('returns dynamic title and og image when players found', async () => {
    const { prisma } = require('@/lib/prisma');
    // When slug is alphabetical (rafael before roger), lookup should reflect that order
    prisma.player.findFirst.mockImplementationOnce(() => ({ atpname: 'Rafael Nadal' }));
    prisma.player.findFirst.mockImplementationOnce(() => ({ atpname: 'Roger Federer' }));

    const meta = await generateMetadata({ params: { slug: ['rafael-nadal-vs-roger-federer'] } as any } as any);

    expect(meta.title).toContain('Rafael Nadal');
    expect(meta.title).toContain('Roger Federer');
    expect(meta.description).toBe('Rafael Nadal vs Roger Federer head-to-head: H2H record, match stats and analysis. Compare ATP players.');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
    expect(meta.openGraph?.url).toBe('https://example.test/h2h/rafael-nadal-vs-roger-federer');
    // robots should allow indexing when no query
    expect(meta.robots).toMatchObject({ index: true, follow: true });

    // querystring should trigger noindex
    const metaFiltered = await generateMetadata({ params: { slug: ['rafael-nadal-vs-roger-federer'] } as any, searchParams: { level: '500' } } as any);
    expect(metaFiltered.robots).toMatchObject({ index: false, follow: true });
  });

  it('falls back to generic metadata when players not found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst.mockImplementation(() => null);

    const meta = await generateMetadata({ params: { slug: ['invalid-slug'] } as any } as any);

    expect(meta.title).toBe('Head-to-Head - TennisMyLife');
    expect(meta.description).toBe('Head-to-head statistics between players.');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
    expect(meta.openGraph?.url).toBe('https://example.test/h2h/invalid-slug');
    expect(meta.robots).toMatchObject({ index: true, follow: true });

    const metaFiltered2 = await generateMetadata({ params: { slug: ['invalid-slug'] } as any, searchParams: { surface: 'Clay' } } as any);
    expect(metaFiltered2.robots).toMatchObject({ index: false, follow: true });
  });
});
