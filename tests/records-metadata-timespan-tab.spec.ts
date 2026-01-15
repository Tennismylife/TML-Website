import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('records [tab] generateMetadata', () => {
  it('returns site-specific Timespan title for tab=timespan', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'timespan' } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Timespan Records | Tennis My Life');
  });
});
