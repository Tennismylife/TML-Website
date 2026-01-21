import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/tournaments/[id]/records/count/titles/page';

describe('count titles metadata', () => {
  it('returns Most Titles title and canonical and includes FAQ JSON-LD', async () => {
    const meta = await generateMetadata({ params: { id: 'australian-open' } as any } as any);
    expect((meta as any).title).toBe('Most Titles at Australian Open | Tennis Records');
    expect((meta as any).alternates?.canonical).toBe('https://stats.tennismylife.org/tournaments/australian-open/records/titles');

    const faqScript = (meta as any).other?.['script[data-schema="faq"][type="application/ld+json"]'];
    expect(faqScript).toBeDefined();
    const faq = JSON.parse(faqScript);
    expect(faq['@type']).toBe('FAQPage');
    expect(Array.isArray(faq.mainEntity)).toBe(true);
    expect(faq.mainEntity.some((q: any) => String(q.name || '').includes('Most Titles'))).toBe(true);
    expect(faq.mainEntity.some((q: any) => (q.acceptedAnswer?.text || '').includes('Open Era'))).toBe(true);
  });
});
