"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { getSurfaceColor } from "@/lib/colors";
import { getFlagFromIOC } from "@/lib/utils";

type SlamCode = "AO" | "RG" | "WIM" | "USO" | "AO-1" | "AO-2";

type SlamWinner = {
  code: SlamCode;
  tourney_date: number | string;
  winner_id?: string | number;
  winner_name: string;
  winner_ioc?: string | null;
};

interface Season {
  year: number;
  surfaces: {
    hard: number;
    grass: number;
    clay: number;
    carpet: number;
    unknown?: number;
  };
  slam_winners?: SlamWinner[];
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch seasons client-side
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/seasons", { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSeasons(data ?? []))
      .catch(() => setSeasons([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-400">
        Loading seasons...
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-extrabold mb-6 text-center">Seasons</h1>

      {/* Legenda superfici */}
      <div className="flex gap-6 justify-center mb-6">
        {["hard", "grass", "clay", "carpet"].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: getSurfaceColor(s) }}
            />
            <span className="text-sm font-medium capitalize">{s}</span>
          </div>
        ))}
      </div>

      {/* Griglia stagioni */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {seasons.map((season) => {
          const total =
            season.surfaces.hard +
            season.surfaces.grass +
            season.surfaces.clay +
            season.surfaces.carpet +
            (season.surfaces.unknown ?? 0);

          const widths = {
            hard: total ? (season.surfaces.hard / total) * 100 : 0,
            grass: total ? (season.surfaces.grass / total) * 100 : 0,
            clay: total ? (season.surfaces.clay / total) * 100 : 0,
            carpet: total ? (season.surfaces.carpet / total) * 100 : 0,
            unknown:
              total && season.surfaces.unknown
                ? (season.surfaces.unknown / total) * 100
                : 0,
          };

          return (
            <div
              key={season.year}
              className="bg-gray-800 rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-shadow duration-300"
            >
              <Link
                href={`/seasons/${season.year}`}
                className="text-xl font-semibold text-blue-400 hover:text-blue-300 hover:underline block text-center mb-3"
              >
                {season.year}
              </Link>

              {/* Barre superfici */}
              <div className="flex h-8 rounded-full overflow-hidden bg-gray-700">
                {Object.entries(widths).map(([surface, width]) => {
                  if (width <= 0) return null;
                  const color = getSurfaceColor(surface);
                  return (
                    <div
                      key={surface}
                      style={{ width: `${width}%`, backgroundColor: color }}
                      className="flex items-center justify-center text-black font-bold text-sm"
                      title={`${surface}: ${season.surfaces[surface as keyof typeof season.surfaces]}`}
                    >
                      {season.surfaces[surface as keyof typeof season.surfaces]}
                    </div>
                  );
                })}
              </div>

              {/* Vincitori Slam */}
              <div className="mt-4 flex flex-col gap-2">
                {(season.slam_winners ?? []).map((sw) => {
                  const flag = getFlagFromIOC(sw.winner_ioc ?? null) || "🏳️";
                  return (
                    <div
                      key={`${season.year}-${sw.code}-${sw.tourney_date}`}
                      className="flex items-center justify-between rounded-xl bg-gray-700/70 px-3 py-2"
                    >
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-600 text-gray-200 font-semibold">
                        {sw.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{flag}</span>
                        <span
                          className="text-sm font-medium text-gray-100 truncate max-w-[10rem]"
                          title={sw.winner_name}
                        >
                          {sw.winner_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {(!season.slam_winners || season.slam_winners.length === 0) && (
                  <div className="text-sm text-gray-400">—</div>
                )}
              </div>
            </div>
          );
        })}

        {seasons.length === 0 && (
          <div className="col-span-5 text-center text-gray-400 text-lg">
            no seasons.
          </div>
        )}
      </div>
    </main>
  );
}
