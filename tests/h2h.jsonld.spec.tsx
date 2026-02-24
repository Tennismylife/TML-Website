import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { player: { findFirst: vi.fn() } } }));
vi.mock('@/lib/site', () => ({ metadataBase: new URL('https://example.test') }));
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/h2h/[...slugs]/page';

describe('h2h page JSON-LD', () => {
  it('injects WebPage and Person JSON-LD scripts when players found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst
      .mockImplementationOnce(() => ({ id: 'p1', atpname: 'Rafael Nadal', slug: 'rafael-nadal' }))
      .mockImplementationOnce(() => ({ id: 'p2', atpname: 'Roger Federer', slug: 'roger-federer' }));

    const el = await Page({ params: { slug: ['rafael-nadal-vs-roger-federer'] } as any } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('Rafael Nadal');
    expect(html).toContain('Roger Federer');
    expect(html).toContain('https://example.test/h2h/rafael-nadal-vs-roger-federer');
    expect(html).toContain('H2H record, match stats and analysis');
  });

  it('renders canonical H1 when players found', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.player.findFirst
      .mockImplementationOnce(() => ({ id: 'p1', atpname: 'Ekaterina Alexandrova', slug: 'ekaterina-alexandrova' }))
      .mockImplementationOnce(() => ({ id: 'p2', atpname: 'Jelena Ostapenko', slug: 'jelena-ostapenko' }));

    const el = await Page({ params: { slug: ['ekaterina-alexandrova-vs-jelena-ostapenko'] } as any } as any);
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('<h1');
    expect(html).toContain('Ekaterina Alexandrova vs Jelena Ostapenko Head to Head Tennis Stats and Match Analysis');
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
