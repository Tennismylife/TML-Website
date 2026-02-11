import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: vi.fn(async ({ where }: any) => ({ slug: 'australian-open' })) } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: vi.fn(async (id: string) => '1') }));

import { generateMetadata } from '@/app/tournaments/[id]/records/percentage/rounds/[title]/page';

const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

describe('percentage rounds metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns Best winning percentage in <round> title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Best winning percentage in Finals at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/percentage/rounds/F`);
  });

  it('resolves numeric id to canonical slug for canonical URL', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: '1', title: 'F' }) } as any);
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/percentage/rounds/F`);
  });
});
