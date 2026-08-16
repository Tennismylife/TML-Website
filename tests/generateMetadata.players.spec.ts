import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'L018',
        slug: 'ivan-lendl',
        player: 'Ivan Lendl',
        atpname: 'Ivan Lendl',
      }),
    },
  },
}));

import { generateMetadata } from '../app/players/[id]/[tab]/page';

describe('generateMetadata for player tab page', () => {
  it('canonical for matches tab points to player landing (no filters)', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams: {} as any } as any);
    expect(meta.alternates?.canonical).toBe('https://stats.tennismylife.org/players/ivan-lendl');
    expect(meta.openGraph?.url).toBe('https://stats.tennismylife.org/players/ivan-lendl');
  });

  it('canonical for matches tab points to player landing (with filters)', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams: { year: '1994' } as any } as any);
    expect(meta.alternates?.canonical).toBe('https://stats.tennismylife.org/players/ivan-lendl');
    expect(meta.openGraph?.url).toBe('https://stats.tennismylife.org/players/ivan-lendl');
  });

  it('keeps the unfiltered matches page noindex, follow', async () => {
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams: {} as any } as any);
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('marks filtered matches combinations noindex, nofollow', async () => {
    const searchParams = { year: '1994', level: 'G', surface: 'Clay', round: 'F' } as any;
    const meta = await generateMetadata({ params: { id: 'ivan-lendl', tab: 'matches' }, searchParams } as any);
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });
});
