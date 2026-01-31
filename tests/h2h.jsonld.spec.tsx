import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/h2h/[...slugs]/page';

vi.mock('@/lib/prisma', () => ({ prisma: { player: { findFirst: vi.fn() } } }));
vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));

describe('h2h page JSON-LD', () => {
  it('injects WebPage and Person JSON-LD scripts when players found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst
      .mockImplementationOnce(() => ({ id: 'p1', atpname: 'Roger Federer', slug: 'roger-federer' }))
      .mockImplementationOnce(() => ({ id: 'p2', atpname: 'Rafael Nadal', slug: 'rafael-nadal' }));

    const el = await Page({ params: { slug: ['roger-federer-vs-rafael-nadal'] } as any } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('Roger Federer');
    expect(html).toContain('Rafael Nadal');
    expect(html).toContain('https://example.test/h2h/roger-federer-vs-rafael-nadal');
    expect(html).toContain('H2H record, match stats and analysis');
  });

  it('injects WebPage JSON-LD script when players not found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst.mockImplementation(() => null);

    const el = await Page({ params: { slug: ['unknown-slug'] } as any } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).not.toContain('"@type":"Person"');
  });
});
