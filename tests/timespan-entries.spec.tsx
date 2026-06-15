import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EntriesSection from '@/app/records/Timespan/Entries';

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

vi.mock('@/lib/utils', () => ({
  getTourneyHref: ({ slug, year }: { slug: string; year: number }) => `/tournaments/${slug}/${year}`,
  getPlayerHref: (slug: string) => `/players/${slug}`,
}));

vi.mock('@/app/records/nav', () => ({
  playerSurfaceOrMatchesUrl: (slug: string) => `/players/${slug}`,
}));

describe('Timespan Entries narrative', () => {
  it('shows the corrected Federer span in the Grand Slam section', () => {
    const html = renderToStaticMarkup(
      <EntriesSection
        selectedSurfaces={new Set()}
        selectedLevels={new Set(['G'])}
        description="Longest Appearance Timespan at Grand Slams"
        initialData={[
          {
            player_id: 'p1',
            player_name: 'Test Player',
            ioc: 'USA',
            overall_timespan: [],
            surface_timespan: [],
            level_timespan: [
              {
                first_tourney_name: 'Roland Garros 2002',
                first_tourney_date: '2002-05-27',
                last_tourney_name: 'Roland Garros 2025',
                last_tourney_date: '2025-06-09',
                days_between: 8400,
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('22 years and 41 days');
    expect(html).not.toContain('22 years and 1 month');
  });

  it('describes Connors using database-only Slam appearances', () => {
    const html = renderToStaticMarkup(
      <EntriesSection
        selectedSurfaces={new Set()}
        selectedLevels={new Set(['G'])}
        description="Longest Appearance Timespan at Grand Slams"
        initialData={[
          {
            player_id: 'p1',
            player_name: 'Test Player',
            ioc: 'USA',
            overall_timespan: [],
            surface_timespan: [],
            level_timespan: [
              {
                first_tourney_name: 'US Open',
                first_tourney_date: '1970-09-02',
                last_tourney_name: 'US Open',
                last_tourney_date: '1992-08-31',
                days_between: 8030,
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('1970 US Open');
    expect(html).toContain('1992 US Open');
    expect(html).toContain('Mark Cox');
    expect(html).toContain('Ivan Lendl');
    expect(html).not.toContain('OpenEraDB');
    expect(html).not.toContain('Tennis Majors');
  });

  it('does not claim Gasquet was the youngest qualifier for Masters 1000', () => {
    const html = renderToStaticMarkup(
      <EntriesSection
        selectedSurfaces={new Set()}
        selectedLevels={new Set(['M'])}
        description="Longest Appearance Timespan at Masters 1000"
        initialData={[
          {
            player_id: 'p2',
            player_name: 'Test Player',
            ioc: 'FRA',
            overall_timespan: [],
            surface_timespan: [],
            level_timespan: [
              {
                first_tourney_name: 'Monte Carlo Masters',
                first_tourney_date: '2002-04-15',
                last_tourney_name: 'Monte Carlo Masters',
                last_tourney_date: '2025-04-07',
                days_between: 8398,
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('15 years old');
    expect(html).not.toContain('youngest player ever to qualify for a Masters 1000 event');
  });

  it('shows the static Djokovic Masters 1000 span text', () => {
    const html = renderToStaticMarkup(
      <EntriesSection
        selectedSurfaces={new Set()}
        selectedLevels={new Set(['M'])}
        description="Longest Appearance Timespan at Masters 1000"
        initialData={[
          {
            player_id: 'p3',
            player_name: 'Test Player',
            ioc: 'SRB',
            overall_timespan: [],
            surface_timespan: [],
            level_timespan: [
              {
                first_tourney_name: 'Cincinnati Masters 2005',
                first_tourney_date: '2005-08-15',
                last_tourney_name: 'Rome Masters 2026',
                last_tourney_date: '2026-05-18',
                days_between: 7571,
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('Cincinnati Masters 2005');
    expect(html).toContain('Rome Masters 2026');
    expect(html).toContain('7,571 days');
    expect(html).toContain('20 years and 271 days');
    expect(html).not.toContain('masters-djokovic');
  });
});
