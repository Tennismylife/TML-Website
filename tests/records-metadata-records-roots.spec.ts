import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/layout';

describe('records roots canonicalization', () => {
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  it('least root canonicalizes under /records/least', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['least'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/least`);
  });

  it('percentage root canonicalizes under /records/percentage', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['percentage'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/percentage`);
  });

  it('rounds root canonicalizes under /records/rounds', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['rounds'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/rounds`);
  });

  it('rounds-on-entries root canonicalizes under /records/rounds-on-entries', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['rounds-on-entries'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/rounds-on-entries`);
  });

  it('streak root canonicalizes under /records/streak', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['streak'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/streak`);
  });

  it('timespan root canonicalizes under /records/timespan', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open', segments: ['timespan'] } as any } as any);
    expect((meta as any).alternates).toBeDefined();
    expect((meta as any).alternates.canonical).toBe(`${site}/tournaments/australian-open/records/timespan`);
  });
});
