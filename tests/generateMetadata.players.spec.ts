import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../app/players/[id]/[tab]/page';

describe('generateMetadata for player tab page', () => {
  it('includes self-referencing canonical for matches tab when filters are active', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams: { year: '1994' } as any } as any);
    expect(meta.alternates?.canonical).toBe('https://stats.tennismylife.org/players/ivan-lendl/matches?year=1994');
    expect(meta.openGraph?.url).toBe('https://stats.tennismylife.org/players/ivan-lendl/matches?year=1994');
  });

  it('omits query from canonical when no filters are active', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams: {} as any } as any);
    expect(meta.alternates?.canonical).toBe('https://stats.tennismylife.org/players/ivan-lendl/matches');
  });

  it('returns noindex when 4 or more filters are active on matches tab', async () => {
    const searchParams = { year: '1994', level: 'G', surface: 'Clay', round: 'F' } as any; // 4 filters
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams } as any);
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('keeps index when fewer than 4 filters are active', async () => {
    const searchParams = { year: '1994', level: 'G', surface: 'Clay' } as any; // 3 filters
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams } as any);
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });
});
