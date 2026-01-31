vi.mock('@/lib/prisma', () => ({ prisma: { player: { findFirst: vi.fn() } } }));
vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));

import { generateMetadata } from '../app/h2h/[...slugs]/page';

describe('h2h generateMetadata', () => {
  it('returns dynamic title and og image when players found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst.mockImplementationOnce(() => ({ atpname: 'Roger Federer' }));
    prisma.player.findFirst.mockImplementationOnce(() => ({ atpname: 'Rafael Nadal' }));

    const meta = await generateMetadata({ params: { slug: ['roger-federer-vs-rafael-nadal'] } as any } as any);

    expect(meta.title).toContain('Roger Federer');
    expect(meta.title).toContain('Rafael Nadal');
    expect(meta.description).toBe('Roger Federer vs Rafael Nadal head-to-head: H2H record, match stats and analysis. Compare ATP players.');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
    expect(meta.openGraph?.url).toBe('https://example.test/h2h/roger-federer-vs-rafael-nadal');
  });

  it('falls back to generic metadata when players not found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst.mockImplementation(() => null);

    const meta = await generateMetadata({ params: { slug: ['invalid-slug'] } as any } as any);

    expect(meta.title).toBe('Head-to-Head - TennisMyLife');
    expect(meta.description).toBe('Head-to-head statistics between players.');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/og/site-preview.png');
    expect(meta.openGraph?.url).toBe('https://example.test/h2h/invalid-slug');
  });
});
