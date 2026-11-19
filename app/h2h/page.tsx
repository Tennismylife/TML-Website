import { prisma } from "@/lib/prisma";
import { getTour } from "@/lib/tour";
import H2HHomeClient from "./H2HHomeClient";
import H2HStaticTable from "./H2HStaticTable";

const featuredPairs = {
  ATP: [
    ["carlos-alcaraz", "jannik-sinner"],
    ["carlos-alcaraz", "novak-djokovic"],
    ["jannik-sinner", "novak-djokovic"],
    ["rafael-nadal", "roger-federer"],
    ["novak-djokovic", "roger-federer"],
    ["novak-djokovic", "rafael-nadal"],
  ],
  WTA: [
    ["chris-evert", "martina-navratilova"],
    ["steffi-graf", "monica-seles"],
    ["martina-hingis", "lindsay-davenport"],
    ["serena-williams", "venus-williams"],
    ["justine-henin", "kim-clijsters"],
    ["iga-swiatek", "aryna-sabalenka"],
  ],
} as const;

async function FeaturedRivalries() {
  const pairs = featuredPairs[await getTour()];
  const players = await prisma.player.findMany({
    where: { slug: { in: [...new Set(pairs.flat())] } },
    select: { id: true, slug: true, atpname: true, ioc: true },
  });
  const playersBySlug = new Map(players.map((player) => [player.slug, player]));
  const cards = await Promise.all(
    pairs.map(async ([leftSlug, rightSlug]) => {
      const left = playersBySlug.get(leftSlug);
      const right = playersBySlug.get(rightSlug);
      if (!left || !right) return null;

      const matches = await prisma.match.findMany({
        where: {
          status: true,
          OR: [
            { winner_id: left.id, loser_id: right.id },
            { winner_id: right.id, loser_id: left.id },
          ],
        },
        select: { winner_id: true, loser_id: true, score: true, tourney_date: true },
        orderBy: { tourney_date: "asc" },
      });

      return (
        <div className="w-80 md:w-96" key={leftSlug + "-vs-" + rightSlug}>
          <H2HStaticTable player1={right} player2={left} matches={matches} />
        </div>
      );
    }),
  );

  return (
    <>
      <div className="mt-10 flex flex-wrap justify-center gap-6">{cards.slice(0, 3)}</div>
      <div className="mt-8 flex flex-wrap justify-center gap-6">{cards.slice(3)}</div>
    </>
  );
}

export default function H2HPage() {
  return <H2HHomeClient featuredRivalries={<FeaturedRivalries />} />;
}
