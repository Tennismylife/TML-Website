"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import RankingTablesLayout from "./RankingTablesLayout";
import System1973 from "./1973System";
import System19741975 from "./19741975System";
import System19761978 from "./19761978System";
import System19791983 from "./19791983System";
import System19841989 from "./19841989System";

type Row = {
  year: number;
  tournament: string;
  start_date: string | null;
  prize_money?: string | null;
  atp_category?: string | number | null;
  tourney_id?: string | number;
};

const START_YEAR = 1973;

export default function RankingTablesPage() {
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState<number>(START_YEAR);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Row; direction: "asc" | "desc" } | null>(null);

  // --- Lettura URL lato client ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yearParam = params.get("year");
    let year = START_YEAR;

    if (yearParam && !isNaN(Number(yearParam))) {
      year = Number(yearParam);
    } else {
      const match = window.location.pathname.match(/^\/rankingtables\/(\d{4})$/);
      if (match && !isNaN(Number(match[1]))) year = Number(match[1]);
    }

    setSelectedYear(year);
  }, []);

  // --- Aggiorna URL quando cambia selectedYear ---
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const currentYear = currentUrl.searchParams.get("year");
    if (currentYear !== String(selectedYear)) {
      currentUrl.searchParams.set("year", String(selectedYear));
      router.replace(currentUrl.toString(), { scroll: false });
    }
  }, [selectedYear, router]);

  // --- Fetch ranking table ---
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/rankingtables?year=${selectedYear}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setRows(Array.isArray(data) ? data : data.rows ?? []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError("Failed to load ranking table.");
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedYear]);

  // --- Sorting ---
  const requestSort = (key: keyof Row) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const sorted = [...rows];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      const aVal = a[key] ?? "";
      const bVal = b[key] ?? "";

      if (key === "year") return direction === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);

      if (key === "prize_money") {
        const aNum = parseFloat(String(aVal).replace(/[^0-9.-]+/g, "")) || 0;
        const bNum = parseFloat(String(bVal).replace(/[^0-9.-]+/g, "")) || 0;
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (key === "start_date") {
        const aTime = aVal ? new Date(String(aVal)).getTime() : 0;
        const bTime = bVal ? new Date(String(bVal)).getTime() : 0;
        return direction === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (key === "atp_category") {
        const toNumber = (val: string | number | null | undefined): number | null => {
          if (val === null || val === undefined) return null;
          const cleaned = String(val).trim().replace(/[^\d.-]+/g, "");
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : null;
        };

        const normalize = (val: string | number | null | undefined) => String(val ?? "").trim().toUpperCase();

        const categoryOrder: Record<string, number> = { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, AA: 7 };

        const classify = (val: string | number | null | undefined) => {
          const num = toNumber(val);
          if (num !== null) return { kind: "number" as const, num };
          const normalized = normalize(val);
          if (categoryOrder[normalized] !== undefined) return { kind: "category" as const, cat: normalized, ord: categoryOrder[normalized] };
          return { kind: "string" as const, str: normalized };
        };

        const A = classify(aVal);
        const B = classify(bVal);

        if (A.kind === "number" && B.kind === "number") return direction === "asc" ? A.num - B.num : B.num - A.num;
        if (A.kind === "category" && B.kind === "category") {
          if (A.ord !== B.ord) return direction === "asc" ? A.ord - B.ord : B.ord - A.ord;
          const aNumInCat = toNumber(aVal);
          const bNumInCat = toNumber(bVal);
          if (aNumInCat !== null && bNumInCat !== null) return direction === "asc" ? aNumInCat - bNumInCat : bNumInCat - aNumInCat;
          return direction === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        }

        if (A.kind === "number" && B.kind !== "number") return direction === "asc" ? -1 : 1;
        if (A.kind !== "number" && B.kind === "number") return direction === "asc" ? 1 : -1;
        if (A.kind === "category" && B.kind === "string") return direction === "asc" ? -1 : 1;
        if (A.kind === "string" && B.kind === "category") return direction === "asc" ? 1 : -1;

        return direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }

      return direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [rows, sortConfig]);

  const getCategoryStyle = (category: string | number | null | undefined) => {
    let catStr = "";

    if (category === null || category === undefined) catStr = "";
    else if (typeof category === "number") {
      const asNumber = category;
      if (asNumber >= 41) catStr = "AA";
      else if (asNumber >= 31 && asNumber <= 40) catStr = "A";
      else if (asNumber >= 21 && asNumber <= 30) catStr = "B";
      else if (asNumber >= 16 && asNumber <= 20) catStr = "C";
      else if (asNumber >= 11 && asNumber <= 15) catStr = "D";
      else if (asNumber >= 6 && asNumber <= 10) catStr = "E";
      else if (asNumber >= 1 && asNumber <= 5) catStr = "F";
    } else if (typeof category === "string") catStr = category.trim().toUpperCase();

    switch (catStr) {
      case "AA": return { border: "border-l-4 border-l-yellow-400", color: "#fbbf24", badge: "bg-yellow-300 text-gray-900", px: "px-5", py: "py-3", text: "text-xl" };
      case "A": return { border: "border-l-4 border-l-purple-500", color: "#8B5CF6", badge: "bg-purple-500 badge-text-black", px: "px-5", py: "py-3", text: "text-xl" };
      case "B": return { border: "border-l-4 border-l-blue-500", color: "#3B82F6", badge: "bg-blue-500 badge-text-black", px: "px-4", py: "py-2.5", text: "text-lg" };
      case "C": return { border: "border-l-4 border-l-emerald-500", color: "#10B981", badge: "bg-emerald-500 badge-text-black", px: "px-3.5", py: "py-2", text: "text-base" };
      case "D": return { border: "border-l-4 border-l-amber-500", color: "#F59E0B", badge: "bg-amber-500 badge-text-black", px: "px-3", py: "py-1.5", text: "text-sm" };
      case "E": return { border: "border-l-4 border-l-rose-500", color: "#F43F5E", badge: "bg-rose-500 badge-text-black", px: "px-2.5", py: "py-1", text: "text-xs" };
      case "F": return { border: "border-l-4 border-l-gray-500", color: "#6B7280", badge: "bg-gray-500 badge-text-black", px: "px-2", py: "py-0.5", text: "text-[0.65rem]" };
      default: return { border: "", color: "#FFFFFF", badge: "bg-gray-600 badge-text-black", px: "px-2", py: "py-1", text: "text-sm" };
    }
  };

  return (
    <RankingTablesLayout selectedYear={selectedYear} onYearSelect={setSelectedYear}>
      {loading && <p className="text-gray-400 text-center">Loading ranking table...</p>}
      {error && <p className="text-red-400 text-center">{error}</p>}

      {selectedYear === 1973 && <System1973 />}
      {selectedYear === 1974 || selectedYear === 1975 ? <System19741975 /> : null}
      {selectedYear === 1976 || selectedYear === 1977 || selectedYear === 1978 ? <System19761978 /> : null}
      {selectedYear >= 1979 && selectedYear <= 1983 ? <System19791983 /> : null}
      {selectedYear >= 1984 && selectedYear <= 1989 ? <System19841989 /> : null}

      {!loading && !error && (
        <section className="overflow-x-auto rounded border border-white/10 bg-gray-800 p-4">
          <table className="min-w-full border-collapse text-white mx-auto">
            <thead>
              <tr className="bg-black">
                <th onClick={() => requestSort("tournament")} className="cursor-pointer px-3 py-2 border border-white/20">Tournament</th>
                <th onClick={() => requestSort("start_date")} className="cursor-pointer px-3 py-2 border border-white/20">Start Date</th>
                <th onClick={() => requestSort("atp_category")} className="cursor-pointer px-3 py-2 border border-white/20">ATP Category</th>
                <th onClick={() => requestSort("prize_money")} className="cursor-pointer px-3 py-2 border border-white/20">Prize Money</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {sortedRows.length > 0 ? (
                sortedRows.map((r, idx) => {
                  const { border, color, badge, px, py, text } = getCategoryStyle(r.atp_category);
                  const key =
                    r.tourney_id !== undefined && r.tourney_id !== null
                      ? `t-${String(r.tourney_id)}-${String(r.year)}`
                      : `r-${idx}-${String(r.year)}-${String(r.tournament).replace(/\s+/g, "-")}`;
                  const href = r.tourney_id ? `/tournaments/${r.tourney_id}/${r.year}` : undefined;
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
                      <td className="px-3 py-2 table-row-text">{r.start_date ? new Date(r.start_date).toLocaleDateString() : "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`${badge} ${px} ${py} ${text} inline-block rounded-full pointer-events-none`}>
                          {r.atp_category ?? "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 table-row-text">{r.prize_money ?? "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-gray-400 text-center">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </RankingTablesLayout>
  );
}
