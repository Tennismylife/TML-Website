import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('records [tab] generateMetadata', () => {
  it('returns site-specific Round Efficiency title for tab=rounds-on-entries', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'rounds-on-entries' } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Round Efficiency by Entries | Tennis Records');
  });
});
