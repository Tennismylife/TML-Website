import Image from 'next/image'
import { Suspense } from 'react'
import LatestMatchesServer from '@/components/LatestMatchesServer'
import SearchPlayerLoader from '@/components/SearchPlayerLoader'

import type { ReactNode } from 'react';

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

// Navigation item types for the homepage grid
type NavSubnote = { text: string; link?: string; color?: string };

type NavItem = {
  href: string;
  title: string;
  subtitle: string;
  description: string;
  colorClass: string;
  accentColor: string;
  icon: ReactNode;
  footnote?: NavSubnote;
  subnote?: NavSubnote;
  badge?: { emoji?: string; text: string; bg?: string; textColor?: string; style?: 'street' | string };
};

import Card from '@/components/Card'
import BlogCard from '@/components/BlogCard'
import { getAllPosts } from '@/lib/blog';

const METADATA_BASE = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? (process.env.NODE_ENV === 'production' ? 'https://stats.tennismylife.org' : 'http://localhost:3000');

export const metadata = {
  title: 'Tennis My Life — Tennis Stats, Records & Matches Database',
  description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
  openGraph: {
    title: 'Tennis My Life — Tennis Stats, Records & Matches Database',
    description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
    siteName: 'TennisMyLife',
    url: 'https://stats.tennismylife.org/',
    type: 'website',
    images: [
      {
        url: new URL('/og/site-preview.png', METADATA_BASE).toString(),
        width: 1200,
        height: 630,
        alt: 'Tennis My Life - tennis statistics and records',
        type: 'image/png'
      }
    ],
  },
  twitter: { card: 'summary_large_image', images: [new URL('/og/site-preview.png', METADATA_BASE).toString()] },
  alternates: { canonical: '/' }
} as const; 
    )}, 
    { href: "/blog", title: "Blog", subtitle: "Articles & Analysis", description: "In-depth articles and commentary on tennis statistics, methods and insights.", colorClass: "text-indigo-400 group-hover:text-indigo-300", accentColor: "#818cf8", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M3 8h9M3 16h9" />
      </svg>
    )}, 
  ];

  const criticalCss = `
    html,body{background:#0f1720;color:#e5e7eb}
    main{padding:0 1rem}
    @media(min-width:640px){main{padding:0 1.5rem}}

    header{background:transparent;border-bottom:none}
    header nav a{color:#fff}
    header nav a.text-yellow-400{color:#facc15}

    .hero-container{width:100%; margin-bottom:3rem;} /* spazio sotto hero */
    .hero-inner{width:100%;padding:0 1rem}
    .hero-img{width:100%;height:auto;border-radius:.75rem;box-shadow:0 10px 15px rgba(2,6,23,.6);object-fit:cover}
    .intro{display:flex;flex-direction:column;align-items:center;text-align:center;margin:0;padding:1rem}

    @media(min-width:768px){
      .hero-container{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:0;justify-items:center}
      .hero-inner{max-width:56rem;padding:0}
      .intro{text-align:center;margin:0;padding:0}
    }
    
    h1{font-weight:800;font-size:2rem;text-align:center;margin-bottom:1.25rem}
    @media(min-width:640px){h1{font-size:2.25rem}}

    .search-input{width:100%;background:#111827;color:#fff;border:1px solid #374151;border-radius:.375rem;padding:.5rem .75rem;outline:none}
    .card-cta{transition:transform .3s ease}
  `;

  const heroLQIP = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230f1720'/></svg>`;

  return (
    <main className="w-full px-4 sm:px-6">
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />

      {/* Hero + Intro */}
      <div className="hero-container" style={{ backgroundImage: `url("${heroLQIP}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="flex flex-col md:flex-row items-center justify-center gap-0">
          
          {/* Header (più largo) */}
          <div className="hero-image-wrapper flex justify-center md:flex-[0_0_60%]">
            <div className="hero-inner md:max-w-[56rem]">
              <Image
                src="/header.jpg"
                alt="Tennis My Life header"
                width={1440}
                height={810}
                priority
                fetchPriority="high"
                quality={78}
                className="w-full h-auto object-cover hero-img rounded-lg"
                placeholder="blur"
                blurDataURL={heroLQIP}
                sizes="(max-width: 400px) 348px, (max-width: 640px) 480px, (max-width: 1024px) 896px, 1440px"
              />
            </div>
          </div>

          {/* Intro */}
          <div className="intro flex flex-col items-center justify-center text-center md:flex-[0_0_40%] p-4 md:p-8 mt-0 md:mt-0">
            <h1 className="text-gray-300 mb-0 text-base md:text-lg font-normal">
              Welcome to TennisMyLife — a comprehensive tennis statistics site. Explore match records, ranking records, tournament calendars, match results, player head-to-head, season summaries, rankings, ranking tables, and advanced metrics to follow players' careers and compare performances
            </h1>
          </div>

        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'url': 'https://stats.tennismylife.org',
            'name': 'Tennis My Life',
            'description': 'Comprehensive tennis statistics, match results, player profiles and historical rankings.'
          }),
        }}
      />

      {/* Client Components */}
      <SearchPlayerLoader />

      {/* Indian Wells Masters LIVE Card — featured */}
      <a
        href="/tournaments/indian-wells-masters/records"
        className="group relative w-full mb-8 flex overflow-hidden rounded-2xl border border-yellow-500/30 shadow-2xl hover:shadow-yellow-500/20 transition-all duration-300 hover:scale-[1.01]"
        style={{ background: 'linear-gradient(135deg, #0f1720 0%, #1a2a10 40%, #2a1a05 100%)' }}
      >
        {/* Glow background */}
        <div className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, #facc15 0%, transparent 70%)' }} />

        {/* Left accent bar */}
        <div className="w-1.5 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #facc15, #f97316)' }} />

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full px-6 py-8 sm:px-10">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-full border-2 border-yellow-400/40 bg-yellow-400/10 shadow-lg shadow-yellow-500/20 text-4xl select-none">
            🌴
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: '#facc15', WebkitTextFillColor: '#facc15' }}>
                Indian Wells Masters
                <span className="ml-2" style={{ color: '#f97316', WebkitTextFillColor: '#f97316' }}>Records</span>
              </h2>
              {/* LIVE badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto"
                style={{ background: '#dc2626', color: '#fff', WebkitTextFillColor: '#fff' }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-300 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
                </span>
                <span className="animate-pulse">LIVE</span>
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-300 max-w-lg">
              All-time stats, milestones and history from one of the most prestigious ATP Masters 1000 events — updated in real time.
            </p>
          </div>

          {/* CTA arrow */}
          <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-yellow-400/30 group-hover:border-yellow-400 group-hover:bg-yellow-400/10 transition-all duration-300">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>

      {/* Featured Records Card */}
      <div className="w-full mb-8">
        <Card href="/records" title="Records" subtitle="All-Time Achievements & Milestones" large colorClass="text-yellow-400 group-hover:text-yellow-300" accentColor="#facc15">
          <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l-2 4H10L8 3z" />
            <circle cx="12" cy="15" r="4" />
          </svg>
        </Card>
      </div>

      <Suspense fallback={
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">📅</span>
              <h2 className="text-base font-semibold text-gray-100">Latest Matches</h2>
            </div>
            <span className="text-xs text-gray-400">Showing last 10 matches</span>
          </div>
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black">
                  {['Date', 'Tournament', 'Round', 'H2H', 'Winner', 'Loser', 'Score'].map((h) => (
                    <th key={h} className="border border-white/30 px-3 py-1.5 text-center text-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/10">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="border border-white/10 px-3 py-1.5">
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }>
        <LatestMatchesServer />
      </Suspense>



      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {navItems.map((item: NavItem) => (
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
            badge={item.badge || (item.title === "Rankings" ? { text: "Vilas #1", style: 'street', textColor: "#ff77b2" } : undefined)}
          >
            {item.icon}
          </Card>
        ))}
      </div>
    </main>
  );
}
