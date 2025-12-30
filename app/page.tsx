import Image from 'next/image'
import LatestMatchesClient from '@/components/LatestMatchesClient'
import SearchPlayerLoaderClient from '@/components/SearchPlayerLoaderClient'
import Card from '@/components/Card'
import type { ReactNode } from 'react';

interface Player { id: string; atpname: string; ioc?: string }
type NavSubnote = { text: string; link?: string; color?: string }
type NavItem = { href: string; title: string; subtitle: string; description: string; colorClass: string; accentColor: string; icon: ReactNode; footnote?: NavSubnote; subnote?: NavSubnote }

export const metadata = {
  title: 'Tennis My Life — Tennis Stats, Records & Matches Database',
  description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
  openGraph: {
    title: 'Tennis My Life — Tennis Stats, Records & Matches Database',
    description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-home.avif`,
        width: 1200,
        height: 630,
        alt: 'Tennis My Life - tennis statistics and records'
      }
    ],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' }
} as const;

export default function HomePage() {
  const navItems: NavItem[] = [
    // Qui copia tutti i navItems che avevi già
  ];

  const criticalCss = `
    html,body{background:#0f1720;color:#e5e7eb}
    main{padding:0 1rem}
    @media(min-width:640px){main{padding:0 1.5rem}}
    header{background:transparent;border-bottom:none}
    header nav a{color:#fff}
    .hero-wrapper{width:100%;margin-bottom:2rem;display:flex;justify-content:center}
    h1{font-weight:800;font-size:2rem;text-align:center;margin-bottom:1.25rem}
    @media(min-width:640px){h1{font-size:2.25rem}}
  `;

  const heroLQIP = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230f1720'/></svg>`;

  return (
    <main className="w-full px-4 sm:px-6">
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />

      {/* Hero image */}
      <div className="w-full mb-8 flex justify-center hero-wrapper" style={{ backgroundImage: `url("${heroLQIP}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <Image
          src="/UnderCostruction.avif"
          alt="Under Construction"
          width={768}
          height={480}
          className="w-full max-w-lg h-auto rounded-xl shadow-lg object-cover"
          priority
          placeholder="blur"
          blurDataURL={heroLQIP}
          sizes="(max-width: 400px) 320px, (max-width: 640px) 480px, 768px"
        />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center w-full">Tennis My Life</h1>
      <p className="text-left text-gray-300 mb-6 max-w-2xl mx-auto">
        Welcome to Tennis My Life — a comprehensive tennis statistics site. Explore tournament calendars, match results, player head-to-head records, season summaries, rankings, and advanced metrics to follow players' careers and compare performances.
      </p>

      {/* JSON-LD per SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'url': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'name': 'Tennis My Life',
        'description': 'Comprehensive tennis statistics, match results, player profiles and historical rankings.'
      })}} />

      {/* Componenti client */}
      <SearchPlayerLoaderClient />
      <LatestMatchesClient />

      {/* Griglia di navigazione */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {navItems.map(item => (
          <Card
            key={item.href}
            href={item.href}
            title={item.title}
            subtitle={item.subtitle}
            description={item.description}
            footnote={item.footnote}
            subnote={item.subnote}
            colorClass={item.colorClass}
            accentColor={item.accentColor}
            badge={item.title === "Rankings" ? { text: "Vilas #1", style: 'street' } : undefined}
          >
            {item.icon}
          </Card>
        ))}
      </div>
    </main>
  );
}
