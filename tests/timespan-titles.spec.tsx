import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Titles from '@/app/records/Timespan/Titles';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    entries: () => [],
  }),
}));

vi.mock('@/components/Flag', () => ({
  default: ({ ioc }: { ioc?: string }) => <span data-testid="flag">{ioc}</span>,
}));

vi.mock('@/components/Pagination', () => ({
  default: () => null,
}));

vi.mock('@/components/Modal', () => ({
  default: () => null,
}));

vi.mock('@/app/records/nav', () => ({
  playerSurfaceOrMatchesUrl: (slug: string) => `/players/${slug}`,
}));

describe('Timespan Titles narrative', () => {
  it('links the ATP title timespan torneys and highlights the golden numbers', () => {
    const html = renderToStaticMarkup(
      <Titles
        selectedSurfaces={new Set()}
        selectedLevels={new Set()}
        description="Longest Timespan Between Two ATP Titles"
        initialData={[
          {
            id: '1',
            name: 'Gaël Monfils',
            ioc: 'FRA',
            firstTourney: 'Sopot 2005',
            firstDate: '2005-08-01',
            lastTourney: 'Auckland 2025',
            lastDate: '2025-01-13',
            spanDays: 7098,
          },
        ]}
      />
    );

    expect(html).toContain('/tournaments/sopot/2005');
    expect(html).toContain('/tournaments/auckland/2025');
    expect(html).toContain('/tournaments/amersfoort/2006');
    expect(html).toContain('/tournaments/athens/2025');
    expect(html).toContain('/tournaments/milan/2001');
    expect(html).toContain('/tournaments/basel/2019');
    expect(html).toContain('/tournaments/sopot/2004');
    expect(html).toContain('/tournaments/roland-garros/2022');
    expect(html).toContain('7,098 days');
    expect(html).toContain('19 years and 163 days');
    expect(html).toContain('7,049 days');
    expect(html).toContain('19 years and 114 days');
    expect(html).toContain('6,839 days');
    expect(html).toContain('18 years and 269 days');
    expect(html).toContain('6,496 days');
    expect(html).toContain('17 years and 291 days');
    expect(html).toContain('6,487 days');
    expect(html).toContain('17 years and 282 days');
    expect(html).toContain('6,454 days');
    expect(html).toContain('6,419 days');
    expect(html).toContain('6,027 days');
  });
});
