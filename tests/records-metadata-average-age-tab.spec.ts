import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('records [tab] generateMetadata', () => {
  it('returns site-specific Average Age title for tab=average-age', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'average-age' } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Average Age Records | Tennis Statistics');
  });
});
