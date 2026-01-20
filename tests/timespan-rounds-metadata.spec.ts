import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/timespan/rounds/[title]/page';
import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';

describe('timespan rounds metadata', () => {
  it('returns Biggest timespan title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Biggest timespan between 2 Finals at Australian Open | Tennis Records');
  });
});
