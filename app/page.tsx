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
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68', title: 'Tennis My Life — Tennis Stats, Records & Matches Database', description: 'Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.', images: [new URL('/og/site-preview.png', METADATA_BASE).toString()] },
  alternates: { canonical: 'https://stats.tennismylife.org/' }
} as const;

export default async function HomePage() {

  const navItems: NavItem[] = [
    { href: "/tournaments", title: "Tournaments", subtitle: "Calendar & Results", description: "Browse upcoming and past tournaments with full draws, schedules, surfaces, and final results. Filter by level (Grand Slam, ATP 1000/500/250) and view match-by-match details.", colorClass: "text-rose-400 group-hover:text-rose-300", accentColor: "#fb7185", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4m7-14V5H5v2a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7H4a3 3 0 0 0 3 3M19 7h1a3 3 0 0 1-3 3" />
      </svg>
    )},
    { href: "/seasons", title: "Seasons", subtitle: "Season Summaries", description: "Explore season-by-season summaries with player form, title lists, key statistics, and notable streaks to understand performance trends over time.", colorClass: "text-emerald-400 group-hover:text-emerald-300", accentColor: "#34d399", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 8h18M5 8h14v13H5z" />
      </svg>
    )},
    { href: "/statistics", title: "Statistics", subtitle: "Advanced Metrics", description: "Dive into advanced metrics such as serve and return stats, break/conversion rates, and other analytics with sortable tables and visualizations.", colorClass: "text-cyan-400 group-hover:text-cyan-300", accentColor: "#22d3ee", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15v3m5-8v8m5-12v12" />
      </svg>
    )},
    { href: "/h2h", title: "H2H", subtitle: "Head-to-Head", description: "Lookup head-to-head histories between two players with match results, dates, tournaments, and surface breakdowns to see how rivals match up.", colorClass: "text-indigo-400 group-hover:text-indigo-300", accentColor: "#818cf8", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h12m0 0-3-3m3 3-3 3M21 17H9m0 0 3 3m-3-3 3-3" />
      </svg>
    )},

    { href: "/recordsranking", title: "Ranking Records", subtitle: "ATP Ranking Records", description: "Discover who leads the records for most weeks at No. x, wins at No. x, and best ranking at No. x.. Top x, streaks, end of the season rankings", colorClass: "text-yellow-400 group-hover:text-yellow-300", accentColor: "#facc15", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      </svg>
    )},
    { href: "/ranking", title: "Rankings", subtitle: "All ATP Rankings Reconstructed Week-by-Week", description: "Explore ATP rankings with date selector, point breakdowns, and quick filters to view weekly", subnote: { text: "This website supports the campaign to have Guillermo Vilas declared world number one", link: "/ranking", color: "#ff77b2" }, colorClass: "text-lime-400 group-hover:text-lime-300", accentColor: "#a3e635", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v11M18 7v11M6 18h12" />
      </svg>
    )},
    { href: "/rankingtables", title: "Rankings Tables", subtitle: "Historical Systems", description: "Browse ranking tables for different historical systems (1973, 1974\u201375, 1976\u201378, etc.)", badge: { emoji: "\uD83C\uDF1F", text: "EXCLUSIVE", style: "street", textColor: "#ff77b2" }, colorClass: "text-amber-400 group-hover:text-amber-300", accentColor: "#f59e0b", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v11M18 7v11M6 18h12" />
      </svg>
    )},
    { href: "/tennis-match-database", title: "TML Database", subtitle: "Official Match DB", description: "Official TennisMyLife match database page with CSV downloads, documentation, and dataset access.", colorClass: "text-slate-400 group-hover:text-slate-300", accentColor: "#94a3b8", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" stroke="none">
        <path d="M12 .297c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.5-1.4-1.9-1.4-1.9-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.6-1.4-5.6-6 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2.9-.3 1.8-.4 2.8-.4s1.9.1 2.8.4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.6-2.9 5.7-5.6 6 .5.4.9 1.1.9 2.3v3.5c0 .3.2.7.8.6 4.8-1.6 8.2-6.2 8.2-11.4 0-6.6-5.4-12-12-12z" />
      </svg>
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

      {/* Monte Carlo Masters LIVE Card — featured */}
      <a
        href="/tournaments/monte-carlo-masters/records"
        className="group relative w-full mb-8 flex overflow-hidden rounded-2xl border border-red-500/30 shadow-2xl hover:shadow-red-500/20 transition-all duration-300 hover:scale-[1.01]"
        style={{ background: 'linear-gradient(135deg, #0f1720 0%, #1a0a10 40%, #2a0505 100%)' }}
      >
        {/* Glow background */}
        <div className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, #ef4444 0%, transparent 70%)' }} />

        {/* Left accent bar */}
        <div className="w-1.5 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #ef4444, #b91c1c)' }} />

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full px-6 py-8 sm:px-10">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-full border-2 border-red-400/40 bg-red-400/10 shadow-lg shadow-red-500/20 shadow-red-500/20 text-4xl leading-none select-none">
            {'\u{1F3B2}'}
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: '#ef4444', WebkitTextFillColor: '#ef4444' }}>
                Monte Carlo Masters
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
              All-time stats, milestones and history from one of the most iconic clay-court ATP Masters 1000 events — updated in real time.
            </p>
          </div>

          {/* CTA arrow */}
          <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-red-400/30 group-hover:border-red-400 group-hover:bg-red-400/10 transition-all duration-300">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
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
