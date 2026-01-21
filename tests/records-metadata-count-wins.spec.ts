import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/wins/page';

describe('count wins metadata', () => {
  it('returns Most Wins At title and canonical/description', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most Wins At Australian Open');
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/wins');
    expect((meta as any).description).toContain('Discover the players with the most wins in the men\'s singles main draw at Australian Open');
  });
});
