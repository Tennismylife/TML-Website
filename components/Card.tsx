'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function Card({
  href,
  title,
  subtitle,
  children,
  large,
  description,
  colorClass,
  accentColor,
}: {
  href: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  large?: boolean;
  description?: string;
  colorClass?: string;
  accentColor?: string;
}) {
  // Extract base color (e.g. 'text-rose-400') if provided for use on the title
  const baseColorClass = colorClass ? colorClass.split(" ")[0] : "text-yellow-400";

  const iconRef = useRef<HTMLSpanElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!accentColor) return;
    if (iconRef.current) iconRef.current.style.setProperty("color", accentColor, "important");
    if (titleRef.current) titleRef.current.style.setProperty("color", accentColor, "important");
  }, [accentColor]);

  const wrapperClass = `group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/70 p-4 hover:bg-gray-700/60 transition-all duration-300 backdrop-blur-md shadow-md
    ${large
      ? "col-span-full flex-col text-center p-6 hover:scale-105 w-full"
      : "w-full flex-col hover:scale-105"}
  `;

  const content = (
    <>
      <span ref={iconRef} className={`${colorClass ?? "text-yellow-400 group-hover:text-yellow-300"} ${large ? "mb-3 text-4xl" : ""}`}>{children}</span>
      <span className={`flex flex-col items-center`}>
        <span ref={titleRef} className={`font-extrabold ${large ? "text-3xl sm:text-4xl" : "text-lg"} text-center ${baseColorClass}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`${large ? "text-base mt-2 text-gray-300" : "text-xs text-gray-400 mt-1"} text-center`}>
            {subtitle}
          </span>
        )}
        {description && (
          <span className={`text-sm text-gray-300 ${large ? "mt-2 max-w-xl" : "mt-2"} text-center`}>
            {description}
          </span>
        )}
      </span>
    </>
  );

  const isExternal = href && href.toLowerCase().startsWith("http");

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Go to ${title}`} className={wrapperClass}>
      {content}
    </a>
  ) : (
    <Link href={href} aria-label={`Go to ${title}`} className={wrapperClass}>
      {content}
    </Link>
  );
}
