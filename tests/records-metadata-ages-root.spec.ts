import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[tab]/page';

describe('ages root metadata', () => {
  it('returns canonical under /ages for the ages tab', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', tab: 'ages' } as any } as any);
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/ages');
  });

  it('returns tournament-specific canonical for youngest/oldest title subpages', async () => {
    const { generateMetadata: youngestMeta } = await import('@/app/tournaments/[id]/records/ages/titles/youngest/page');
    const ym = await youngestMeta({ params: { id: 'australian-open' } as any } as any);
    expect((ym as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/ages/titles/youngest');

    const { generateMetadata: oldestMeta } = await import('@/app/tournaments/[id]/records/ages/titles/oldest/page');
    const om = await oldestMeta({ params: { id: 'australian-open' } as any } as any);
    expect((om as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/ages/titles/oldest');
  });
});
