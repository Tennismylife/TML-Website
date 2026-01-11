/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Route from '../../app/api/track-visit/route';
import * as Tracker from '../../lib/visitTracker';

function makeReq(body?: any, headers?: Record<string,string>) {
  return {
    json: async () => body || {},
    headers: {
      get: (k: string) => (headers && headers[k.toLowerCase()]) || null,
    },
  } as any;
}

describe('/api/track-visit route', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns ok true and calls trackVisit', async () => {
    const spy = vi.spyOn(Tracker, 'trackVisit').mockResolvedValueOnce(true as any);
    const res: any = await Route.POST(makeReq({ pageTitle: 'foo' }, { 'x-original-user-agent': 'UA', 'x-original-ip': '1.2.3.4' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('returns 200 even if trackVisit throws', async () => {
    vi.spyOn(Tracker, 'trackVisit').mockRejectedValueOnce(new Error('boom'));
    const res: any = await Route.POST(makeReq({ pageTitle: 'foo' }, { 'x-original-user-agent': 'UA' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
