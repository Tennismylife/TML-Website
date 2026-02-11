import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: vi.fn(async ({ where }: any) => ({ slug: 'australian-open' })) } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: vi.fn(async (id: string) => '1') }));

import { generateMetadata } from '@/app/tournaments/[id]/records/count/played/page';

const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

describe('count played metadata', () => {
  it('returns Most matches played title and canonical/description', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most matches played at Australian Open');
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/count/played');
    expect((meta as any).description).toContain('A list of players with the most matches played at Australian Open');
  });
  it('resolves numeric id to canonical slug for canonical URL', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: '1' }) } as any);
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/count/played`);
  });});
