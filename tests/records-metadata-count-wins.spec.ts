import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/wins/page';

describe('count wins metadata', () => {
  it('returns Most Wins At title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most Wins At Australian Open');
  });
});
