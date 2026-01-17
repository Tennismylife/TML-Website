// metadataBase: use explicit public origin when available, otherwise
// - in production: use the canonical production URL
// - in development: fall back to localhost:3000 so OG/twitter images resolve locally
const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? (process.env.NODE_ENV === 'production' ? 'https://stats.tennismylife.org' : 'http://localhost:3000');
export const metadataBase = new URL(origin);
