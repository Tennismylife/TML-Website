import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    }
  }
}));

import { prisma } from '@/lib/prisma';
import { generateMetadata } from '../app/players/[id]/[tab]/page';

beforeEach(() => {
  (prisma.player.findUnique as any).mockReset();
  // default: no slug mapping in prisma
  (prisma.player.findUnique as any).mockResolvedValue(null);
});

describe('PlayerTabPage slug-map fallback', () => {
  it('resolves legacy code via /api/slug-map and uses mapped slug for metadata', async () => {
    // Mock fetch for /api/slug-map
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/slug-map')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ players: { H377: 'dominik-hrbaty' } }) });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    // First call to prisma.findUnique (slug 'h377') returns null, second call for mapped slug returns player
    (prisma.player.findUnique as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ player: 'Dominik Hrbaty', atpname: 'Dominik Hrbaty', slug: 'dominik-hrbaty' });

    const meta = await generateMetadata({ params: { id: 'H377', tab: 'matches' }, searchParams: {} as any } as any);
    expect(meta.title).toContain('Dominik Hrbaty');
    expect((meta.openGraph as any).url).toContain('/players/dominik-hrbaty/matches');
  });
});
