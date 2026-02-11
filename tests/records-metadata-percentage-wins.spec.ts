import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/percentage/wins/page';

describe('percentage wins metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns Best Winning Percentage title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Best Winning Percentage at Australian Open');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/percentage/wins`);
  });
});
