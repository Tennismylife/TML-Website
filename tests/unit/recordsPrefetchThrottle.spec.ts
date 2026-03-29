import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimitedFetch } from '@/lib/recordsPrefetchThrottle';

describe('records prefetch throttle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.RECORDS_SSR_PREFETCH_DELAY_MS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RECORDS_SSR_PREFETCH_DELAY_MS;
  });

  it('skips known 410 records combinations during prefetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const res = await rateLimitedFetch('http://localhost/api/records/atage/entries?age=30&round=R128&surface=Clay');
    const body = await res.json();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('x-records-prefetch-skipped')).toBe('known-410');
    expect(body).toEqual([]);
  });

  it('keeps prefetch active for valid records combinations', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[{"id":1}]', { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const res = await rateLimitedFetch('http://localhost/api/records/atage/entries?age=30&surface=Clay');
    const body = await res.json();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(body).toEqual([{ id: 1 }]);
  });

  it('skips prefetch when required parameters are missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const res = await rateLimitedFetch('http://localhost/api/records/atage/entries?level=250&surface=Grass');
    const body = await res.json();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('x-records-prefetch-skipped')).toBe('missing-required-params');
    expect(body).toEqual([]);
  });

  it('skips prefetch for non-existing/non-prefetchable records API paths', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const res = await rateLimitedFetch('http://localhost/api/records/streak?subtab=wins&level=D&surface=Carpet');
    const body = await res.json();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('x-records-prefetch-skipped')).toBe('unknown-route');
    expect(body).toEqual([]);
  });
});
