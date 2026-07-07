import { describe, expect, it } from "vitest";
import { aggregateEditionPlayerStats, pct } from "@/app/tournaments/[id]/[year]/editionAggregateStats";

describe("aggregateEditionPlayerStats", () => {
  it("aggregates winner and loser stats from the player's perspective", () => {
    const rows = aggregateEditionPlayerStats([
      {
        winner_id: "p1",
        winner_name: "Alpha",
        loser_id: "p2",
        loser_name: "Beta",
        w_ace: 10,
        l_ace: 4,
        w_df: 2,
        l_df: 5,
        w_svpt: 50,
        l_svpt: 40,
        w_1stIn: 30,
        l_1stIn: 25,
        w_1stWon: 24,
        l_1stWon: 16,
        w_2ndWon: 10,
        l_2ndWon: 5,
        w_bpSaved: 3,
        w_bpFaced: 5,
        l_bpSaved: 2,
        l_bpFaced: 6,
      },
      {
        winner_id: "p2",
        winner_name: "Beta",
        loser_id: "p1",
        loser_name: "Alpha",
        w_ace: 8,
        l_ace: 7,
        w_df: 1,
        l_df: 3,
        w_svpt: 48,
        l_svpt: 52,
        w_1stIn: 31,
        l_1stIn: 33,
        w_1stWon: 22,
        l_1stWon: 25,
        w_2ndWon: 9,
        l_2ndWon: 11,
        w_bpSaved: 4,
        w_bpFaced: 7,
        l_bpSaved: 1,
        l_bpFaced: 4,
      },
    ]);

    expect(rows).toHaveLength(2);

    const alpha = rows.find((row) => row.playerId === "p1");
    const beta = rows.find((row) => row.playerId === "p2");

    expect(alpha).toMatchObject({
      matches: 2,
      wins: 1,
      losses: 1,
      aces: 17,
      doubleFaults: 5,
      servicePoints: 102,
      firstServeIn: 63,
      firstServeWon: 49,
      secondServeWon: 21,
      breakPointsSaved: 4,
      breakPointsFaced: 9,
      returnPointsPlayed: 88,
      returnPointsWon: 36,
    });

    expect(beta).toMatchObject({
      matches: 2,
      wins: 1,
      losses: 1,
      aces: 12,
      doubleFaults: 6,
      servicePoints: 88,
      firstServeIn: 56,
      firstServeWon: 38,
      secondServeWon: 14,
      breakPointsSaved: 6,
      breakPointsFaced: 13,
      returnPointsPlayed: 102,
      returnPointsWon: 32,
    });
  });

  it("returns null percentages when denominators are zero", () => {
    expect(pct(0, 0)).toBeNull();
    expect(pct(5, 0)).toBeNull();
  });
});
