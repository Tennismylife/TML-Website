import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: vi.fn(async ({ where }: any) => ({ slug: 'australian-open' })) } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: vi.fn(async (id: string) => '1') }));

import { generateMetadata } from '@/app/tournaments/[id]/records/least/rounds/[title]/page';

const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

describe('least rounds metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns Least <round> title (regular round)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Least games lost to reach F at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/least/rounds/F`);
  });

  it('resolves numeric id to canonical slug for canonical URL (regular round)', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: '1', title: 'F' }) } as any);
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/least/rounds/F`);
  });

  it('returns Least W title (win title)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'W' } as any } as any);
    expect((meta as any).title).toBe('Least games lost to win title at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/least/rounds/W`);
  });
});