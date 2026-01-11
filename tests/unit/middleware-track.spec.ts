/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';

function makeReq(url: string, ua?: string, xff?: string) {
  return {
    method: 'GET',
    nextUrl: new URL(url),
    url,
    headers: {
      get: (k: string) => {
        if (k.toLowerCase() === 'user-agent') return ua || null;
        if (k.toLowerCase() === 'x-forwarded-for' || k.toLowerCase() === 'x-real-ip') return xff || null;
        return null;
      },
    },
  } as any;
}

describe('middleware tracking integration', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends track-visit for normal UA with proper headers and body', async () => {
    let trackCall: any = null;

    fetchSpy.mockImplementation(async (input: any, opts?: any) => {
      const s = String(input);
      if (s.includes('/api/track-visit')) {
        trackCall = { input: s, opts };
        return { ok: true } as any;
      }
      return { ok: false } as any;
    });

    const req = makeReq('http://localhost/players/novak-djokovic', 'Mozilla/5.0 (Win)', '1.2.3.4');
    await middleware(req as any);

    expect(trackCall).toBeTruthy();
    expect(trackCall.opts).toBeTruthy();
    expect(trackCall.opts.headers['x-original-user-agent']).toBe('Mozilla/5.0 (Win)');
    expect(trackCall.opts.headers['x-original-ip']).toBe('1.2.3.4');
    const body = JSON.parse(trackCall.opts.body);
    expect(body.pageTitle).toBe('players novak djokovic');
    expect(body.pageUrl).toBe('http://localhost/players/novak-djokovic');
  });

  it('does not send track-visit for common bots', async () => {
    let trackCalled = false;
    fetchSpy.mockImplementation(async (input: any, opts?: any) => {
      const s = String(input);
      if (s.includes('/api/track-visit')) {
        trackCalled = true;
        return { ok: true } as any;
      }
      return { ok: false } as any;
    });

    const req = makeReq('http://localhost/players/novak-djokovic', 'Googlebot/2.1 (+http://www.google.com/bot.html)', '5.6.7.8');
    await middleware(req as any);

    expect(trackCalled).toBe(false);
  });
});
