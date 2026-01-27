import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import Header from '../components/Header'
import GAListener from './analytics/GAListener' // importa il listener
import TrackPageClient from './TrackPageClient' // client-side visit tracking (fires on route changes)
import MatomoClient from '../components/MatomoClient' // client-side Matomo tracker (migrated from pages/_app.tsx) 
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  preload: true,
  fallback: ['system-ui', 'sans-serif']
})


const siteDescription = 'TML aggregates tennis matches, rankings, player profiles and records.'

// Resolve metadataBase to a canonical origin for Open Graph/Twitter images
// Prefer explicit env var; fallback to production origin to ensure no localhost is used in metadata.
const METADATA_BASE = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://stats.tennismylife.org';
const METADATA_BASE_URL = new URL(METADATA_BASE);

export const metadata: Metadata = {
  metadataBase: new URL('https://stats.tennismylife.org'),
  title: {
    default: 'Tennis Rankings, Matches & Records - TennisMyLife',
    template: '%s - TennisMyLife',
  },
  description: 'Tennis data, rankings, stats and records.',
}; 

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en" className={montserrat.variable}>
      <head>
        {/* Favicon: provide canonical root favicon.ico and handy fallbacks for other platforms */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0f172a" />

        {/* Preconnects for third-party origins (do this early but sparingly) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for additional performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Preload manually removed: asset is automatically preloaded where needed to avoid duplicate <link rel="preload"> entries */}
      </head>
      <body className="min-h-screen bg-gray-900 text-gray-100">
        {/* Site JSON-LD (rendered server-side in root layout) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: 'https://stats.tennismylife.org',
              name: 'TennisMyLife — Tennis Rankings, Matches & Records',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://stats.tennismylife.org/search?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              }
            }),
          }}
        />

        {/* GA Listener */}
        <GAListener />
        {/* Client-side visit tracker: fires on initial load and route changes */}
        <TrackPageClient />
        {/* Matomo tracker (migrated from pages/_app.tsx) */}
        <MatomoClient />
        <Header />
        <main className="w-full px-0 py-6">
          {(() => {
            try {
              return children;
            } catch (e: any) {
              // Log thrown objects from child rendering (detect Next HTTP fallback digest)
              // eslint-disable-next-line no-console
              console.error('RootLayout caught error rendering children', { error: e, isHttpFallback: !!(e && typeof e === 'object' && 'digest' in e && String((e as any).digest).startsWith('NEXT_HTTP_ERROR_FALLBACK')), digest: (e && (e as any).digest) || null, stack: (e && (e as any).stack) || null });
              // Rethrow so Next's boundary handling proceeds as normal
              throw e;
            }
          })()}
        </main>

        <footer className="text-sm text-gray-400 py-6 text-center">
          © 2026 TennisMyLife - Tennis Data Records History
        </footer>
      </body>
    </html>
  )
}
