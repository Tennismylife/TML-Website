"use client";

import Link from "@/components/TourLink";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { tourPath } from "@/lib/tour-path";

export default function Header({ tour }: { tour: "ATP" | "WTA" }) {
  const pathname = usePathname();
  const recordsPath = tourPath("/records", tour);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a')) as HTMLAnchorElement[];

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href === pathname) {
        a.style.setProperty('color', '#FBBF24', 'important');
        a.style.setProperty('font-weight', '600', 'important');
      } else {
        a.style.setProperty('color', '#FFFFFF', 'important');
        a.style.removeProperty('font-weight');
      }
    });
  }, [pathname]);

  const linkClass = (href: string) =>
    clsx(
      "transition-colors",
      pathname === tourPath(href, tour)
        ? "text-yellow-400 font-semibold"
        : "text-white hover:text-yellow-400"
    );

  return (
    <header className="bg-gray-800/95 border-b border-gray-700 w-full text-white">
      <div className="flex flex-wrap items-center w-full px-4 py-3 gap-4">

        {/* LOGO */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.webp"
            alt="Site logo"
            width={140}
            height={40}
            priority
            unoptimized
            className="object-contain"
          />
        </Link>

        {/* NAV */}
        <nav ref={navRef} aria-label="Primary" className="order-last flex w-full flex-wrap gap-4 xl:order-none xl:w-auto">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/tournaments" className={linkClass("/tournaments")}>Tournaments</Link>
          <Link href="/seasons" className={linkClass("/seasons")}>Seasons</Link>
          <Link href="/statistics" className={linkClass("/statistics")}>Statistics</Link>
          <Link href="/h2h" className={linkClass("/h2h")}>H2H</Link>
          {tour === "ATP" && <Link href="/ranking" className={linkClass("/ranking")}>Rankings</Link>}
          {tour === "ATP" && <Link href="/rankingtables" className={linkClass("/rankingtables")}>Ranking Tables</Link>}
          <Link href={recordsPath} className={linkClass(recordsPath)}>Match Records</Link>
          {tour === "ATP" && <Link href="/recordsranking" className={linkClass("/recordsranking")}>Ranking Records</Link>}
          {/* Link alla nuova pagina Tennis Match Database */}
          {tour === "ATP" && <Link href="/tennis-match-database" className={linkClass("/tennis-match-database")}>Match Database</Link>}
          <Link href="/blog" className={linkClass("/blog")}>Blog</Link>
        </nav>

        <form action="/api/tour" method="post" aria-label="Tennis tour" className="ml-auto flex shrink-0 rounded-lg border border-gray-600">
          <input type="hidden" name="returnTo" value={pathname ?? "/"} />
          {(["ATP", "WTA"] as const).map((option) => (
            <button
              key={option}
              type="submit"
              name="tour"
              value={option}
              aria-pressed={tour === option}
              className={clsx("rounded-md px-3 py-1.5 text-sm font-semibold", tour === option ? "bg-yellow-400 text-gray-900" : "hover:bg-gray-700")}
            >
              {option}
            </button>
          ))}
        </form>
      </div>
    </header>
  );
}
