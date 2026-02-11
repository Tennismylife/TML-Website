import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/streak/page';

describe('streak metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns title and canonical for streak root', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Australian Open Longest Winning Streaks | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/streak`);
    expect((meta as any).openGraph?.url).toBe(`${site}/tournaments/australian-open/records/streak`);
  });
});
