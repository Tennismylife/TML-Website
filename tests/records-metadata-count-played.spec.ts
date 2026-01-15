import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/played/page';

describe('count played metadata', () => {
  it('returns Most matches played title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most matches played at Australian Open');
  });
});
