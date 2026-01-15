import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/[...segments]/page';

describe('records generateMetadata', () => {
  it('returns humanized title for percentage per-round', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['percentage', 'per-round'] } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Australian Open Percentage Records by Round | Tennis Statistics');
  });

  it('returns title for ages titles youngest', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'titles', 'youngest'] } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Youngest Title Winners at Australian Open | Tennis Records');
  });

  it('returns title for ages titles oldest', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'titles', 'oldest'] } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Oldest Title Winners at Australian Open | Tennis Records');
  });

  it('returns title for ages youngestrounds F', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['ages', 'youngestrounds', 'F'] } as any } as any);
    expect(meta).toHaveProperty('title');
    expect((meta as any).title).toBe('Youngest Players in F at Australian Open | Tennis Records');
  });
});
