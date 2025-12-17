import { describe, it, expect } from "vitest";
import buildMostPointsResult from "./utils";

describe("buildMostPointsResult", () => {
  it("uses ranking row player when present", () => {
    const grouped = [{ playerId: "p1", _max: { points: 500 } }];
    const candidates = [
      { playerId: "p1", points: 500, rankingDate: { date: new Date("2020-01-01") }, player: { atpname: "N. Player", ioc: "USA" } },
    ];
    const players: any[] = [];

    const res = buildMostPointsResult(grouped as any, candidates as any, players as any);
    expect(res[0].name).toBe("N. Player");
    expect(res[0].country).toBe("USA");
    expect(res[0].date).toBe("2020-01-01");
  });

  it("falls back to players table when ranking row has no player", () => {
    const grouped = [{ playerId: "p2", _max: { points: 420 } }];
    const candidates = [
      { playerId: "p2", points: 420, rankingDate: { date: new Date("2021-06-15") }, player: null },
    ];
    const players = [{ id: "p2", atpname: "Fallback Player", ioc: "FRA" }];

    const res = buildMostPointsResult(grouped as any, candidates as any, players as any);
    expect(res[0].name).toBe("Fallback Player");
    expect(res[0].country).toBe("FRA");
    expect(res[0].date).toBe("2021-06-15");
  });

  it("uses id placeholder when missing everywhere", () => {
    const grouped = [{ playerId: "p3", _max: { points: 300 } }];
    const candidates = [{ playerId: "p3", points: 300, rankingDate: null, player: null }];
    const players: any[] = [];

    // By default placeholders are not allowed, so the result should be empty
    const res = buildMostPointsResult(grouped as any, candidates as any, players as any);
    expect(res.length).toBe(0);
  });

  it("returns placeholder when allowPlaceholder is true", () => {
    const grouped = [{ playerId: "p3", _max: { points: 300 } }];
    const candidates = [{ playerId: "p3", points: 300, rankingDate: null, player: null }];
    const players: any[] = [];

    const res = buildMostPointsResult(grouped as any, candidates as any, players as any, { allowPlaceholder: true });
    expect(res[0].name).toBe("Player p3");
    expect(res[0].country).toBe("UNK");
    expect(res[0].date).toBe("N/A");
  });
});
