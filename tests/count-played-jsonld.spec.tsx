import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlayedPage from '@/app/tournaments/[id]/records/count/played/page';

vi.mock('@/lib/tournamentHeaderCache', () => ({ fetchTournamentHeaderCached: () => Promise.resolve({ name: 'Australian Open' }) }));

describe('count played page JSON-LD', () => {
  it('injects WebPage, FAQPage and BreadcrumbList JSON-LD scripts', async () => {
    const el = await PlayedPage({ params: { id: 'australian-open' } as any } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('Most matches played at Australian Open');
  });
});