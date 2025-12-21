"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useRef } from "react";

export default function Header() {
  const pathname = usePathname();
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
      pathname === href
        ? "text-yellow-400 font-semibold"
        : "text-white hover:text-yellow-400"
    );

  return (
    <header className="bg-gray-800/95 border-b border-gray-700 w-full text-white">
      <div className="flex items-center w-full px-4 py-3 gap-4">

        {/* LOGO */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Site logo"
            width={140}
            height={40}
            priority
            className="object-contain"
          />
        </Link>

        {/* NAV */}
        <nav ref={navRef} className="flex flex-wrap gap-4">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/tournaments" className={linkClass("/tournaments")}>Tournaments</Link>
          <Link href="/seasons" className={linkClass("/seasons")}>Seasons</Link>
          <Link href="/statistics" className={linkClass("/statistics")}>Statistics</Link>
          <Link href="/h2h" className={linkClass("/h2h")}>H2H</Link>
          <Link href="/player-vs-player" className={linkClass("/player-vs-player")}>Player vs Player</Link>
          <Link href="/ranking" className={linkClass("/ranking")}>Ranking</Link>
          <Link href="/rankingtables" className={linkClass("/rankingtables")}>Ranking Tables</Link>
          <Link href="/records" className={linkClass("/records")}>Records</Link>
        </nav>

      </div>
    </header>
  );
}
