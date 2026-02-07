import Flag from '@/components/Flag';
import Link from "next/link";
import { getPlayerHrefWithTab } from "@/lib/utils";

interface Player {
  atpname: string | null;
  ioc?: string | null;
  id?: string;
}

interface Match {
  winner_name: string | null;
  loser_name: string | null;
}

interface H2HHeaderServerProps {
  wins1: number;
  wins2: number;
  perc1?: number;
  perc2?: number;
  player1: Player;
  player2: Player;
  matches: Match[];
}

export default function H2HHeaderServer({
  wins1,
  wins2,
  perc1 = 0,
  perc2 = 0,
  player1,
  player2,
  matches,
}: H2HHeaderServerProps) {
  const lastMatches = [...matches].slice(-5).reverse();

  const getColor = (a: number, b: number) => {
    if (a > b) return "!text-green-400";
    if (a < b) return "!text-red-400";
    return "text-gray-300";
  };

  const color1 = getColor(wins1, wins2);
  const color2 = getColor(wins2, wins1);
  const percColor1 = getColor(perc1, perc2);
  const percColor2 = getColor(perc2, perc1);

  return (
    <div className="mb-4 p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg shadow">
      {/* Nomi + bandierine in alto */}
      <div className="flex justify-between items-center mb-6 -mt-2">
        {/* Player 1 - sinistra */}
        <div className="flex items-center gap-3">
          <Flag ioc={player1.ioc ?? undefined} className="w-6 h-4 inline-block" />
          <Link href={getPlayerHrefWithTab((player1 as any).slug ?? String(player1.id ?? ''), 'matches')} className="text-2xl font-bold text-gray-100 hover:underline">
            {player1.atpname ?? ''}
          </Link>
        </div>

        {/* Player 2 - destra */}
        <div className="flex items-center gap-3">
          <Link href={getPlayerHrefWithTab((player2 as any).slug ?? String(player2.id ?? ''), 'matches')} className="text-2xl font-bold text-gray-100 text-right hover:underline">
            {player2.atpname ?? ''}
          </Link>
          <Flag ioc={player2.ioc ?? undefined} className="w-6 h-4 inline-block" />
        </div>
      </div>

      <div className="text-center">
        {/* SCORE SUMMARY */}
        <div className="text-7xl font-bold mb-2">
          <span className={color1}>{wins1}</span>{" "}
          <span className="text-gray-400">-</span>{" "}
          <span className={color2}>{wins2}</span>
        </div>

        <div className="text-2xl font-semibold mb-4">
          <span className={percColor1}>Wins: {perc1.toFixed(1)}%</span>{" "}
          <span className="text-gray-400"> - </span>
          <span className={percColor2}>{perc2.toFixed(1)}%</span>
        </div>

        {/* LAST 5 MATCHES */}
        <div className="flex justify-between mt-4">
          {/* Player 1 */}
          <div className="flex gap-2 justify-start">
            {lastMatches.map((m, i) => {
              const isWin = m.winner_name === player1.atpname;
              const isLoss = m.loser_name === player1.atpname;
              return (
                <span
                  key={i}
                  className={`font-bold text-2xl ${
                    isLoss
                      ? "!text-green-400"
                      : isWin
                      ? "!text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {isWin ? "L" : isLoss ? "W" : "-"}
                </span>
              );
            })}
          </div>

          {/* Player 2 */}
          <div className="flex gap-2 justify-end">
            {lastMatches.map((m, i) => {
              const isWin = m.winner_name === player2.atpname;
              const isLoss = m.loser_name === player2.atpname;
              return (
                <span
                  key={i}
                  className={`font-bold text-2xl ${
                    isLoss
                      ? "!text-green-400"
                      : isWin
                      ? "!text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {isWin ? "L" : isLoss ? "W" : "-"}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
