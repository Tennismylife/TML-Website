import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/percentage/wins/page';

describe('percentage wins metadata', () => {
  it('returns Best Winning Percentage title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Best Winning Percentage at Australian Open');
  });
});
