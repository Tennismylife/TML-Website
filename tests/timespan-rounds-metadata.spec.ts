import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/timespan/rounds/[title]/page';
import TimespanFull from '@/app/tournaments/[id]/records/timespan/_components/TimespanFull';

describe('timespan rounds metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns Biggest timespan title and canonical', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Biggest timespan between 2 Finals at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/timespan/rounds/F`);
    expect((meta as any).openGraph?.url).toBe(`${site}/tournaments/australian-open/records/timespan/rounds/F`);
  });
});
