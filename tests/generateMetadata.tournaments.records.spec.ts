import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/layout';

describe('tournament records canonical', () => {
  it('produces tournament-specific canonical hrefs with normalized query params', async () => {
    const slugs = ['australian-open', 'wimbledon', 'french-open'];

    for (const slug of slugs) {
      const meta = await generateMetadata({ params: { id: slug, segments: [] } as any, searchParams: { surface: 'clay', level: 'g' } as any } as any);

      // canonical should point to the tournament-specific records root
      expect(meta.alternates?.canonical).toContain(`/tournaments/${slug}/records`);

      // canonical should include normalized and sorted query params (level uppercased, surface capitalized)
      expect(meta.alternates?.canonical).toBe(`https://stats.tennismylife.org/tournaments/${slug}/records?level=G&surface=Clay`);
    }
  });
});
