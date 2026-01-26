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
  badge,
  footnote,
  subnote,
}: {
  href: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  large?: boolean;
  description?: string;
  colorClass?: string;
  accentColor?: string;
  badge?: { emoji?: string; text: string; bg?: string; textColor?: string; style?: 'street' | string; live?: boolean };
  footnote?: { text: string; link?: string; color?: string };
  subnote?: { text: string; link?: string; color?: string };
}) {
  // Extract base color (e.g. 'text-rose-400') if provided for use on the title
  const baseColorClass = colorClass ? colorClass.split(" ")[0] : "text-yellow-400";

  const iconRef = useRef<HTMLSpanElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const subnoteRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!accentColor) return;
    if (iconRef.current) iconRef.current.style.setProperty("color", accentColor, "important");
    if (titleRef.current) titleRef.current.style.setProperty("color", accentColor, "important");
  }, [accentColor]);

  // Force subnote styling when needed: use a simple solid color to avoid rendering artifacts
  useEffect(() => {
    if (!subnote || !subnoteRef.current) return;
    const el = subnoteRef.current;
    const color = subnote.color ?? STREET_PINK;
    el.style.setProperty('color', color, 'important');
  }, [subnote, badge]);

  // Shared constant for street-style pink
  const STREET_PINK = '#ff77b2';

  // Compute subnote style to visually match the street badge when requested
  const subnoteStyle = subnote
    ? (subnote.color
        ? { color: subnote.color }
        : { color: badge?.style === 'street' ? STREET_PINK : '#ff77b2' })
    : undefined;

  const wrapperClass = `relative group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/70 p-4 hover:bg-gray-700/60 transition-all duration-300 backdrop-blur-md shadow-md
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

        {/* Footnote (e.g., Seasonal snapshots) */}
        {footnote && (
          <div className="mt-2 text-center">
            <span style={{ color: footnote.color ?? accentColor, fontWeight: 600 }}>{footnote.text}</span>
          </div>
        )}

        {/* Subnote (Italian campaign line) */}
        {subnote && (
          <div className="mt-1 text-center">
            {href ? (
              <span ref={subnoteRef} className="text-sm" style={subnoteStyle}>{subnote.text}</span>
            ) : subnote.link ? (
              <Link href={subnote.link}>
                <span ref={subnoteRef} className="text-sm" style={subnoteStyle}>{subnote.text}</span>
              </Link>
            ) : (
              <span ref={subnoteRef} className="text-sm" style={subnoteStyle}>{subnote.text}</span>
            )}
          </div>
        )}
      </span>

      {/* Optional badge top-right */}
      {badge && (
        (() => {
          const bg = badge.bg ?? "#ec4899";
          const isTransparent = bg === "transparent" || bg === "none";
          // Use explicit badge.textColor if provided; otherwise default to pink for transparent badges and black for solid badges
          const textColor = isTransparent ? (badge.textColor ?? "#f472b6") : (badge.textColor ?? "#000000");

          // Street style: artistic badge (supports live indicator)
          if (badge.style === 'street') {
            const isLive = Boolean((badge as any).live) || String(badge.text).toLowerCase() === 'live';
            return (
              <div className="absolute top-3 right-3 rounded-md shadow-md px-0 py-0" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))' }}>
                <span
                  className="inline-block font-extrabold leading-none"
                  style={{
                    backgroundColor: isLive ? '#dc2626' : 'rgba(31,41,55,0.7)',
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transform: 'rotate(-1deg) skew(-2deg)',
                    color: isLive ? '#ffffff' : (badge.textColor ?? '#000000'),
                    WebkitTextFillColor: isLive ? '#ffffff' : (badge.textColor ?? '#000000'),
                    WebkitTextStroke: isLive ? '0 rgba(0,0,0,0.0)' : '0 rgba(0,0,0,0.0)',
                    textShadow: isLive ? '0 4px 12px rgba(0,0,0,0.65)' : '0 6px 18px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.04)',
                    fontSize: '1.15rem',
                    letterSpacing: '0.2px',
                    lineHeight: 1,
                    border: isLive ? '1px solid rgba(0,0,0,0.25)' : '1px solid rgba(255,255,255,0.02)'
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    {isLive && (
                      <span className="relative inline-block w-2 h-2">
                        <span className="absolute inline-block w-full h-full rounded-full bg-red-400 opacity-60 animate-ping" />
                        <span className="relative inline-block w-2 h-2 rounded-full bg-red-600" />
                      </span>
                    )}
                    <span className={isLive ? 'animate-pulse' : ''}>{String(badge.text)}</span>
                  </span>
                </span>
              </div>
            );
          }

          return (
            <div
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold shadow-md"
              style={{ backgroundColor: bg, color: textColor }}
            >
              {badge.emoji ? <span className="text-lg leading-none">{badge.emoji}</span> : null}
              <span className="text-sm tracking-tight">{badge.text}</span>
            </div>
          );
        })()
      )}
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
