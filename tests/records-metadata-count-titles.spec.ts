import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/titles/page';

describe('count titles metadata', () => {
  it('returns Most Titles title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most Titles at Australian Open');
  });
});
