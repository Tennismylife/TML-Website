import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/roundsonentries/rounds/[title]/page';

describe('roundsonentries rounds metadata', () => {
  it('returns Most <round>s on Entries title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Most Fs on Entries at Australian Open | Tennis Records');
  });

  it('returns Most Titles on Entries for Winner', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'Winner' } as any } as any);
    expect((meta as any).title).toBe('Most Titles on Entries at Australian Open | Tennis Records');
  });
});
