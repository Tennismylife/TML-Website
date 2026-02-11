import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { tournament: { findUnique: vi.fn(async ({ where }: any) => ({ slug: 'australian-open' })) } } }));
vi.mock('@/lib/tournament', () => ({ resolveCanonicalTourneyId: vi.fn(async (id: string) => '1') }));

import { generateMetadata } from '@/app/tournaments/[id]/records/rounds/[round]/page';

const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

describe('rounds per-round metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns canonical for a regular round (R128)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', round: 'R128' } as any } as any);
    expect((meta as any).title).toBeDefined();
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/rounds/R128`);
  });

  it('returns canonical for final (F)', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', round: 'F' } as any } as any);
    expect((meta as any).title).toBeDefined();
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/rounds/F`);
  });

  it('resolves numeric id to canonical slug for rounds', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: '1', round: 'F' }) } as any);
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/rounds/F`);
  });
});
