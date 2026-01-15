import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[...segments]/page';

describe('records generateMetadata', () => {
  it('returns humanized Timespan title for timespan root', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['timespan'] } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Timespan Records | Tennis My Life');
  });
});
