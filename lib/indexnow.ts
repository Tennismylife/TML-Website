/**
 * Utility for sending IndexNow submissions to Bing & compatible crawlers.
 *
 * Usage scenario: after you generate or update a page (or sitemap), call
 * `notifyIndexNow` with one or more URLs and your key info.  The function
 * wraps the simple POST API documented at
 * https://www.bing.com/webmaster/help/indexnow-api-8366228.
 *
 * Example in a build script:
 *
 * ```ts
 * import { notifyIndexNow } from '../lib/indexnow';
 *
 * const key = process.env.INDEXNOW_KEY!;               // e.g. "2fba..."
 * const keyLocation = process.env.INDEXNOW_KEY_LOCATION!; // https://example.com/key.txt
 *
 * // call after deploying a new post or when sitemaps are regenerated
 * await notifyIndexNow(["https://example.com/foo"], key, keyLocation);
 * ```
 */

export async function notifyIndexNow(
  urls: string[],
  key: string,
  keyLocation: string
): Promise<string> {
  if (urls.length === 0) {
    return 'no urls provided';
  }

  const params = new URLSearchParams();
  for (const u of urls) params.append('url', u);
  params.append('key', key);
  params.append('keyLocation', keyLocation);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    body: params,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`IndexNow request failed: ${res.status} ${text}`);
  }

  return res.text();
}
