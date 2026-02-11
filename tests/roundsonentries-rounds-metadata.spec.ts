import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/roundsonentries/rounds/[title]/page';

describe('roundsonentries rounds metadata', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('returns Most <round>s on Entries title', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'F' } as any } as any);
    expect((meta as any).title).toBe('Most Finals on Entries at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/rounds-on-entries/F`);
    expect((meta as any).openGraph?.url).toBe(`${site}/tournaments/australian-open/records/rounds-on-entries/F`);
  });

  it('returns Most Titles on Entries for Winner', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', title: 'Winner' } as any } as any);
    expect((meta as any).title).toBe('Most Titles on Entries at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe(`${site}/tournaments/australian-open/records/rounds-on-entries/Winner`);
    expect((meta as any).openGraph?.url).toBe(`${site}/tournaments/australian-open/records/rounds-on-entries/Winner`);
  });
});
