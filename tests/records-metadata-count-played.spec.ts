import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/played/page';

describe('count played metadata', () => {
  it('returns Most matches played title and canonical/description', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most matches played at Australian Open');
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/count/played');
    expect((meta as any).description).toContain('A list of players with the most matches played at Australian Open');
  });
});
