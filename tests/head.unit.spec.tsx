/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';

import { metadata as siteMetadata } from '../app/page';
import { generateMetadata as playerGen } from '../app/players/[id]/page';
import { generateMetadata as tournamentGen } from '../app/tournaments/[id]/page';

describe('Head metadata', () => {
  it('exports site metadata', () => {
    expect(siteMetadata.title).toBeTruthy();
    expect(siteMetadata.description).toBeTruthy();
    expect(siteMetadata.openGraph).toBeTruthy();
  });

  it('generates player metadata correctly', async () => {
    const meta = await playerGen({ params: { id: 'novak-djokovic' } } as any);
    expect(meta.title).toContain('Novak Djokovic');
    expect(meta.openGraph?.url).toContain('/players/novak-djokovic');
  });

  it('generates tournament metadata correctly', async () => {
    const meta = await tournamentGen({ params: { id: 'australian-open' } } as any);
    expect(meta.title).toContain('Australian Open');
    expect(meta.openGraph?.url).toContain('/tournaments/australian-open');
  });
});
