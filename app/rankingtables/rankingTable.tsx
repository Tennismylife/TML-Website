"use client";

import { useMemo } from "react";
import { Row, sortRows, getCategoryStyle, normalizeCategory, SortConfig } from "./rankingUtils";
import { useRouter } from "next/navigation";

interface RankingTableProps {
  rows: Row[];
  sortConfig: SortConfig;
  requestSort: (key: keyof Row) => void;
  loading: boolean;
  error: string | null;
}

export default function RankingTable({
  rows,
  sortConfig,
  requestSort,
  loading,
  error,
}: RankingTableProps) {
  const router = useRouter();

  const sortedRows = useMemo(() => sortRows(rows, sortConfig), [rows, sortConfig]);

  if (loading)
    return <p className="text-gray-400 text-center">Loading ranking table...</p>;
  if (error) return <p className="text-red-400 text-center">{error}</p>;

  return (
    <section className="overflow-x-auto rounded border border-white/10 bg-gray-800 p-4">
      <table className="min-w-full border-collapse text-white mx-auto">
        <thead>
          <tr className="border border-white/30 px-4 py-2 text-center text-lg">
            <th
              onClick={() => requestSort("tournament")}
              className="cursor-pointer px-3 py-2 border border-white/20 text-white"
            >
              Tournament
            </th>
            <th
              onClick={() => requestSort("tourney_date")}
              className="cursor-pointer px-3 py-2 border border-white/20 text-white"
            >
              Start Date
            </th>
            <th
              onClick={() => requestSort("atp_category")}
              className="cursor-pointer px-3 py-2 border border-white/20 text-white"
            >
              ATP Category
            </th>
            <th
              onClick={() => requestSort("prize_money")}
              className="cursor-pointer px-3 py-2 border border-white/20 text-white"
            >
              Prize Money
            </th>
          </tr>
        </thead>

        <tbody className="font-bold">
          {sortedRows.length > 0 ? (
            sortedRows.map((r, idx) => {
              const categoryForStyle = normalizeCategory(r.atp_category);
              const { border, color, badge, px, py, text } =
                getCategoryStyle(categoryForStyle);

              const displayValue = r.atp_category ?? "-";

              const tourneyPart =
                r.tourney_id !== undefined &&
                r.tourney_id !== null &&
                !isNaN(Number(r.tourney_id))
                  ? r.tourney_id
                  : `idx${idx}`;

              const safeTournament = r.tournament.replace(/[^a-zA-Z0-9]+/g, "-");

              const key = `t-${tourneyPart}-${r.year}-${safeTournament}`;
              const href = r.tourney_id
                ? `/tournaments/${r.tourney_id}/${r.year}`
                : undefined;

              const clickable = Boolean(href);

              return (
                <tr
                  key={key}
                  onClick={() => clickable && router.push(href!)}
                  onKeyDown={(e) => {
                    if (!clickable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(href!);
                    }
                  }}
                  role={clickable ? "link" : undefined}
                  tabIndex={clickable ? 0 : -1}
                  className={`border-b border-white/10 hover:bg-gray-700/50 cursor-pointer ${border}`}
                  style={{ color }}
                >
                  <td className="px-3 py-2 table-row-text">{r.tournament}</td>
                  <td className="px-3 py-2 table-row-text">
                    {r.tourney_date
                      ? new Date(r.tourney_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`${badge} ${px} ${py} ${text} inline-block rounded-full pointer-events-none`}
                    >
                      {displayValue}
                    </span>
                  </td>
                  <td className="px-3 py-2 table-row-text">
                    {r.prize_money ?? "-"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-gray-400 text-center"
              >
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
