import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../app/players/[id]/page';

describe('generateMetadata for player parent page', () => {
  it('returns self-referencing canonical when ?tab=matches and filters active', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl' }, searchParams: { tab: 'matches', year: '1994' } as any } as any);
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/players/ivan-lendl/matches?year=1994');
  });

  it('defaults to matches canonical when no tab provided (no redirect behavior)', async () => {
    const meta = await generateMetadata({ params: { id: 'L018' }, searchParams: {} as any } as any);
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/players/L018/matches');
  });
});
