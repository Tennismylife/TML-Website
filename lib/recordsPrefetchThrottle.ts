// Central rate-limited fetch used by SSR prefetch in `app/records`.
// - Default delay: 250ms in development, 0ms otherwise
// - Override with RECORDS_SSR_PREFETCH_DELAY_MS (ms)
// This serializes prefetch requests per Node process so API calls are spaced out
// (helps reduce bursty traffic from many server components rendering concurrently).

const DEFAULT_DEV_DELAY_MS = 250;
let _lastPromise: Promise<any> = Promise.resolve();
let _lastTime = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const envVal = process.env.RECORDS_SSR_PREFETCH_DELAY_MS;
  const defaultDelay = process.env.NODE_ENV === 'development' ? DEFAULT_DEV_DELAY_MS : 0;
  const delayMs = Number(envVal ?? defaultDelay) || 0;

  // no-op if throttling disabled
  if (delayMs <= 0) return fetch(input as any, init);

  // chain requests so they're spaced by at least `delayMs`
  const p = _lastPromise.then(async () => {
    const now = Date.now();
    const elapsed = now - _lastTime;
    if (elapsed < delayMs) await sleep(delayMs - elapsed);
    _lastTime = Date.now();
    return fetch(input as any, init);
  });

  // keep chain alive even if a call fails
  _lastPromise = p.then(() => undefined, () => undefined);

  return p as Promise<Response>;
}
