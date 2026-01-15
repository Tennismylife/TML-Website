import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/percentage/rounds/[title]/page';

describe('percentage rounds metadata', () => {
  it('returns Best winning percentage in <round> title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Best winning percentage in F at Australian Open | Tennis Records');
  });
});
