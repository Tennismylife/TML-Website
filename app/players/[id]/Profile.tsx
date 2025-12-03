"use client";

import { useEffect, useState } from "react";
import { Player } from "@/types";
import { getFlagFromIOC, countryNames, calculateAge } from "@/lib/utils";
import { FaTrophy } from "react-icons/fa";

interface PlayerTabsClientProps {
  player: Player;
}

interface Stats {
  titles: number;
  finals: number;
  wins: number;
  losses: number;
  surfaces: {
    Hard: { w: number; l: number; titles: number };
    Clay: { w: number; l: number; titles: number };
    Grass: { w: number; l: number; titles: number };
    Carpet: { w: number; l: number; titles: number };
  };
}

export default function PlayerTabsClient({ player }: PlayerTabsClientProps) {
  const [stats, setStats] = useState<Stats>({
    titles: 0,
    finals: 0,
    wins: 0,
    losses: 0,
    surfaces: {
      Hard: { w: 0, l: 0, titles: 0 },
      Clay: { w: 0, l: 0, titles: 0 },
      Grass: { w: 0, l: 0, titles: 0 },
      Carpet: { w: 0, l: 0, titles: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [animatedTitles, setAnimatedTitles] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/matches?player_id=${player.id}`);
        const matches = res.ok ? await res.json() : [];

        const newStats: Stats = {
          titles: 0,
          finals: 0,
          wins: 0,
          losses: 0,
          surfaces: {
            Hard: { w: 0, l: 0, titles: 0 },
            Clay: { w: 0, l: 0, titles: 0 },
            Grass: { w: 0, l: 0, titles: 0 },
            Carpet: { w: 0, l: 0, titles: 0 },
          },
        };

        matches.forEach((m: any) => {
          const isWinner = m.winner_id === player.id;
          const isFinal = m.round === "F";
          const surface = m.surface;

          if (isWinner) newStats.wins++;
          else newStats.losses++;

          // LOGICA TITOLI AGGIORNATA
          if (isFinal) {
            newStats.finals++;
            if (isWinner && m.team_event !== true) {
              newStats.titles++;
              if (surface && newStats.surfaces[surface]) newStats.surfaces[surface].titles++;
            }
          }

          if (surface && newStats.surfaces[surface]) {
            if (isWinner) newStats.surfaces[surface].w++;
            else newStats.surfaces[surface].l++;
          }
        });

        setStats(newStats);

        // Animazione contatore titoli
        let counter = 0;
        const interval = setInterval(() => {
          counter++;
          if (counter > newStats.titles) {
            clearInterval(interval);
            setAnimatedTitles(newStats.titles);
          } else {
            setAnimatedTitles(counter);
          }
        }, 150);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [player.id]);

  const surfaceColors: Record<string, string> = {
    Hard: "bg-blue-500",
    Clay: "bg-red-500",
    Grass: "bg-green-500",
    Carpet: "bg-yellow-400",
  };

  const getBackhandLabel = (backhand?: string | null) => {
    if (!backhand) return "N/A";
    const b = String(backhand).toUpperCase().trim();
    if (b === "1H" || b === "1") return "one handed";
    if (b === "2H" || b === "2") return "two handed";
    return backhand;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4">
      {/* Player Info */}
      <div className="bg-gray-800/80 text-gray-100 shadow-lg rounded-xl p-6 flex flex-col gap-4 border border-gray-700">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {player.atpname} {player.ioc && getFlagFromIOC(player.ioc)}
        </h2>
        <p className="text-gray-300">{player.ioc ? countryNames[player.ioc] || player.ioc : "N/A"}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
          <div>Age: {calculateAge(player.birthdate)}</div>
          <div>Hand: {player.hand === "R" ? "Right" : player.hand === "L" ? "Left" : "N/A"}</div>
          <div>Backhand: {getBackhandLabel(player.backhand)}</div>
          <div>Height: {player.height ? `${player.height} cm` : "N/A"}</div>
          <div>Weight: {player.weight ? `${player.weight} kg` : "N/A"}</div>
          <div>Turned Pro: {player.turnedpro ?? "N/A"}</div>
          <div className="col-span-2">Coaches: {player.coaches ?? "N/A"}</div>
        </div>
      </div>

      {/* Overall Record con barre animate, testo dentro e nomi superfici più grandi */}
      <div className="bg-gray-800/80 text-gray-100 shadow-lg rounded-xl p-6 flex flex-col gap-4 border border-gray-700">
        <div className="text-center mb-4">
          <p className="text-gray-400">Overall Record</p>
          <p className="text-2xl font-bold">
            {loading
              ? "..."
              : `${stats.wins}-${stats.losses} (${stats.wins + stats.losses > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1) + "%" : "N/A"})`}
          </p>
        </div>

        {/* Barra totale */}
        {stats.wins + stats.losses > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-1">Total Win %</p>
            <div className="w-full bg-gray-700 rounded-full h-8 relative">
              <div
                className="bg-gray-500 h-8 rounded-full transition-all duration-1000 flex items-center justify-center"
                style={{ width: `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)}%` }}
              >
                <span className="text-gray-100 font-bold text-sm md:text-base">
                  {stats.wins}-{stats.losses} ({((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Barre per superficie */}
        {["Hard", "Clay", "Grass", "Carpet"].map((surface) => {
          const surfaceWins = stats.surfaces[surface].w;
          const surfaceLosses = stats.surfaces[surface].l;
          const total = surfaceWins + surfaceLosses;
          const percent = total > 0 ? (surfaceWins / total) * 100 : 0;

          return (
            <div key={surface} className="mb-3">
              {/* Nome superficie più grande */}
              <p className="text-base md:text-lg text-gray-400 mb-1 font-semibold">{surface}</p>
              <div className="w-full bg-gray-700 rounded-full h-8 relative">
                <div
                  className={`h-8 rounded-full transition-all duration-1000 flex items-center justify-center ${surfaceColors[surface]}`}
                  style={{ width: `${percent}%` }}
                >
                  <span className="text-gray-100 font-bold text-sm md:text-base">
                    {total > 0 ? `${surfaceWins}-${surfaceLosses} (${percent.toFixed(1)}%)` : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Titles per Surface con coppa animata */}
      <div className="bg-gray-800/80 text-gray-100 shadow-lg rounded-xl p-6 flex flex-col gap-4 border border-gray-700 relative">
        {/* Totale titoli in alto a destra */}
        <div className="absolute top-4 right-4 flex items-center gap-2 text-yellow-400">
          <FaTrophy size={20} />
          <span className="font-bold">{loading ? "..." : animatedTitles}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-300 text-center mb-2">Titles by Surface</h3>

        {["Hard", "Clay", "Grass", "Carpet"].map((surface) => (
          <div key={surface} className="flex justify-between items-center px-2 py-1 border-b border-gray-700 last:border-b-0">
            <span className={`px-3 py-1 rounded-full text-white text-sm ${surfaceColors[surface]}`}>{surface}</span>
            <span className="font-bold">{loading ? "..." : stats.surfaces[surface].titles}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
