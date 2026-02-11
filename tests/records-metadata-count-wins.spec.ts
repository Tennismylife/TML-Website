import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: vi.fn(async ({ where }: any) => ({ slug: 'australian-open' })) } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: vi.fn(async (id: string) => '1') }));

import { generateMetadata } from '@/app/tournaments/[id]/records/count/wins/page';

describe('count wins metadata', () => {
  it('returns Most Wins At title and canonical/description', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most Wins At Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/count/wins');
    expect((meta as any).description).toContain('Discover the players with the most wins in the men\'s singles main draw at Australian Open');
  });

  it('resolves numeric id to canonical slug for canonical URL', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: '1' }) } as any);
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/count/wins');
  });
});
