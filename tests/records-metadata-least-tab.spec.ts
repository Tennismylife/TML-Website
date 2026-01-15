import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('records [tab] generateMetadata', () => {
  it('returns site-specific Least Games title for tab=least', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'least' } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Least Games Lost to Reach a Round | Tennis Records');
  });
});
