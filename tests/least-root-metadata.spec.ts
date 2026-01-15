import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/layout';

describe('least root metadata', () => {
  it('returns tournament-specific least root title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['least'] } as any } as any);
    expect((meta as any).title).toBe('Australian Open Least Games Lost to Reach a Round | Tennis Records');
  });
});