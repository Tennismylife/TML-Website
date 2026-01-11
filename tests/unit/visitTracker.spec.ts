import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackVisit } from '../../lib/visitTracker';
import { prisma } from '../../lib/prisma';

describe('trackVisit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts a visit for normal UA', async () => {
    const fakeRes = [{ id: 1 }];
    const spy = vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce(fakeRes as any);

    const req: any = {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT)', host: 'localhost' },
      originalUrl: '/players/novak-djokovic',
      protocol: 'https',
    };

    const ok = await trackVisit(req, 'Player page');
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('inserts when called with Next/Request style headers and forwarded headers', async () => {
    const fakeRes = [{ id: 2 }];
    const spy = vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce(fakeRes as any);

    const req: any = {
      headers: { get: (k: string) => {
        if (k === 'x-original-user-agent') return 'Mozilla/5.0 (Win)';
        if (k === 'x-original-ip') return '1.2.3.4';
        return null;
      } },
      nextUrl: { href: 'https://example.com/foo' },
    };

    const ok = await trackVisit(req, 'Next-style page');
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalled();

  });

  it('skips bots by user agent', async () => {
    const spy = vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ id: 1 }] as any);
    const req: any = { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }, originalUrl: '/foo' };
    const ok = await trackVisit(req, 'bot page');
    expect(ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles DB errors gracefully', async () => {
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));
    const req: any = { headers: { 'user-agent': 'Mozilla/5.0' }, originalUrl: '/error-case', protocol: 'http', host: 'example.com' };
    const ok = await trackVisit(req, 'error case');
    expect(ok).toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
