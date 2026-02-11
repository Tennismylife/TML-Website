import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('count root metadata', () => {
  it('returns canonical under /count for the count tab', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'count' } as any } as any);
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/count');
  });
});
