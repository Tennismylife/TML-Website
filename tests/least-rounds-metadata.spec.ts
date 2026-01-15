import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/least/rounds/[title]/page';

describe('least rounds metadata', () => {
  it('returns Least <round> title (regular round)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Least games lost to reach F at Australian Open | Tennis Records');
  });

  it('returns Least W title (win title)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'W' } as any } as any);
    expect((meta as any).title).toBe('Least games lost to win title at Australian Open | Tennis Records');
  });
});