
export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { getSurfaceColor } from "@/lib/colors";
import { getFlagFromIOC } from "@/lib/utils";

/* ---------- Fetch ---------- */
async function getSeasons() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${protocol}://${host}/api/seasons`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch seasons");
  return res.json();
}

/* ---------- Tipi ---------- */
type SlamCode = "AO" | "RG" | "WIM" | "USO" | "AO-1" | "AO-2";

type SlamWinner = {
  code: SlamCode;
  tourney_date: number | string;        // YYYYMMDD
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
    // unknown?: number; // se presente nella tua API
  };
  // Array già cronologico
  slam_winners?: SlamWinner[];
}

export default async function SeasonsPage() {
  let seasons: Season[] = [];
  try {
    seasons = await getSeasons();
  } catch (error) {
    console.error(error);
  }

  return (
    <main className="mx-auto max-w-7xl min-h-screen bg-gray-900 text-gray-100 p-6">
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

      {/* Griglia stagioni: 5 card per riga su lg+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {seasons.map((season) => {
          // Se includi unknown nell'API, somma nel totale
          const total =
            season.surfaces.hard +
            season.surfaces.grass +
            season.surfaces.clay +
            season.surfaces.carpet +
            ((season.surfaces as any).unknown ?? 0);

          const widths = {
            hard: total ? (season.surfaces.hard / total) * 100 : 0,
            grass: total ? (season.surfaces.grass / total) * 100 : 0,
            clay: total ? (season.surfaces.clay / total) * 100 : 0,
            carpet: total ? (season.surfaces.carpet / total) * 100 : 0,
            unknown:
              total && (season.surfaces as any).unknown
                ? ((season.surfaces as any).unknown / total) * 100
                : 0,
          };

          return (
            <div
              key={season.year}
              className="bg-gray-800 rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Link anno */}
              <Link
                href={`/seasons/${season.year}`}
                className="text-xl font-semibold text-blue-400 hover:text-blue-300 hover:underline block text-center mb-3"
              >
                {season.year}
              </Link>

              {/* Barre superfici */}
              <div className="flex h-8 rounded-full overflow-hidden bg-gray-700">
                {Object.entries(season.surfaces).map(([surface, value]) => {
                  const key = surface as keyof typeof widths;
                  const width = widths[key] ?? 0;
                  if (!value || width <= 0) return null;

                  const color = getSurfaceColor(surface);
                  const gradient = `linear-gradient(90deg, ${color} 0%, ${color}80 50%, ${color} 100%)`;

                  return (
                    <div
                      key={surface}
                      className="flex items-center justify-center text-black font-bold text-sm"
                      style={{
                        width: `${width}%`,
                        background: gradient,
                        transition: "width 0.5s ease-in-out",
                      }}
                      title={`${surface}: ${value}`}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>

              {/* Vincitori Slam in colonna (array già cronologico) */}
              <div className="mt-4 flex flex-col gap-2">
                {(season.slam_winners ?? []).map((sw) => {
                  const flag = getFlagFromIOC(sw.winner_ioc ?? null) || "🏳️";

                  return (
                    <div
                      key={`${season.year}-${sw.code}-${sw.tourney_date}`}
                      className="flex items-center justify-between rounded-xl bg-gray-700/70 px-3 py-2"
                    >
                      {/* Sigla torneo (AO, RG, WIM, USO o AO-1/AO-2) */}
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-600 text-gray-200 font-semibold">
                        {sw.code}
                      </span>

                      {/* Vincitore: bandiera + nome (link se disponibile) */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{flag}</span>
                        {sw.winner_id ? (
                          <Link
                            href={`/players/${sw.winner_id}`}
                            className="text-sm font-medium text-gray-100 hover:text-blue-300 hover:underline truncate max-w-[10rem]"
                            title={sw.winner_name}
                          >
                            {sw.winner_name}
                          </Link>
                        ) : (
                          <span
                            className="text-sm font-medium text-gray-100 truncate max-w-[10rem]"
                            title={sw.winner_name}
                          >
                            {sw.winner_name}
                          </span>
                        )}
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
