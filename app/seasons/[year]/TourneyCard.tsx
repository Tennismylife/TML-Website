"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { getFlagFromIOC, getLevelFullName } from "@/lib/utils";
import { getSurfaceColor, getLevelColor } from "@/lib/colors";

interface TourneyTile {
  key: string;
  extractedId: string;
  surface?: string | null;
  name: string;
  date: string;
  draw_size: string;
  winner_ioc: string;
  winner: string;
  loser_ioc: string;
  loser: string;
  score: string;
  round?: string;
  level?: string;
}

function Flag({ ioc }: { ioc: string }) {
  if (!ioc) return null;
  const flag = getFlagFromIOC(ioc);
  return <span className="mr-1">{flag}</span>;
}

export default function TourneyCard({ tourney }: { tourney: TourneyTile }) {
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(139,92,246,0.25), transparent 60%)`;
    }
  };

  const surfaceColor = getSurfaceColor(tourney.surface ?? "");
  const levelColor = getLevelColor(tourney.level ?? "");

  return (
    <Link
      href={`/tournaments/${tourney.extractedId}/${new Date(tourney.date).getFullYear()}`}
      aria-label={`View details for ${tourney.name} tournament`}
      className="group"
    >
      <div
        className="relative p-5 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-lg border border-gray-700 overflow-hidden
                   transition-transform duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer flex flex-col justify-between h-full"
        onMouseMove={handleMouseMove}
      >
        {/* Glow dinamico */}
        <div ref={glowRef} className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300" />

        {/* Header */}
        <div className="relative flex justify-between items-start">
          <div className="text-sm text-gray-400">
            {new Date(tourney.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{ backgroundColor: surfaceColor, color: "#FFFFFF" }}
            >
              {tourney.surface ?? "Unknown"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-600 text-white">
              {tourney.draw_size}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: levelColor, color: "#FFFFFF" }}
            >
              {getLevelFullName(tourney.level) ?? "Level"}
            </span>
          </div>
        </div>

        {/* Nome Torneo */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center font-bold text-gray-100 text-2xl leading-snug truncate py-8">
            {tourney.name}
          </div>
        </div>

        {/* Finale (allineata a sinistra) */}
        <div className="text-sm text-gray-200 mt-2 pb-1 text-left break-keep px-1">
          <span className="inline-flex items-center">
            🏆<Flag ioc={tourney.winner_ioc} />
            <span className="text-green-400 font-semibold"> {tourney.winner}</span>
          </span>
          <span className="text-gray-400 mx-1">def.</span>
          <span className="inline-flex items-center">
            <Flag ioc={tourney.loser_ioc} />
            <span className="text-red-400 font-medium">{tourney.loser}</span>
          </span>
          <span className="text-gray-300 ml-1">{tourney.score.replace(/[()]/g, "")}</span>
        </div>
      </div>
    </Link>
  );
}
