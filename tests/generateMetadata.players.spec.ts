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
});
