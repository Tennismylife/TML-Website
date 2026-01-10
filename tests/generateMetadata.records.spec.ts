import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../app/records/[...slug]/page';

describe('generateMetadata for records page', () => {
  it('includes canonical with active query params and sets index for principal combination (Hard + All others)', async () => {
    const meta = await generateMetadata({ params: { slug: ['wins'] }, searchParams: { surface: 'Hard' } as any });
    expect(meta.alternates?.canonical).toContain('?surface=Hard');
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('remains indexable for non-principal combinations', async () => {
    const meta = await generateMetadata({ params: { slug: ['same'] }, searchParams: { surface: 'Hard', level: 'G' } as any });
    expect(meta.alternates?.canonical).toContain('?level=G');
    expect(meta.robots).toEqual({ index: true, follow: true });
  });
});