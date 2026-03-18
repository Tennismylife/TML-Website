"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import RankingTable, { Ranking } from "./RankingTable";

interface DateItem {
  year: number;
  dates: Date[];
}

export default function RankingPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [datesByYear, setDatesByYear] = useState<DateItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchParamsClient, setSearchParamsClient] = useState<URLSearchParams | null>(null);

  // Track last replaced search string to avoid duplicate router.replace calls
  const lastReplacedSearchRef = React.useRef<string | null>(null);
  // If there was an initial URL search (user-provided), suppress automatic replaces until the user interacts
  const skipInitialReplaceRef = React.useRef<boolean>(false);
  const userInteractedRef = React.useRef<boolean>(false);

  useEffect(() => {
    const search = window.location.search || "";
    setSearchParamsClient(new URLSearchParams(search));
    if (search && search !== "") skipInitialReplaceRef.current = true;
  }, []);

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch("/api/ranking/dates");
        const data = await res.json();

        const grouped: DateItem[] = [];
        data.dates?.forEach((d: string) => {
          const dateObj = new Date(d);
          const year = dateObj.getFullYear();
          const existing = grouped.find((g) => g.year === year);
          if (existing) existing.dates.push(dateObj);
          else grouped.push({ year, dates: [dateObj] });
        });

        grouped.forEach((g) => g.dates.sort((a, b) => b.getTime() - a.getTime()));
        grouped.sort((a, b) => b.year - a.year);

        setDatesByYear(grouped);

        if (searchParamsClient) {
          const yearParam = searchParamsClient.get("year");
          const dateParam = searchParamsClient.get("date");

          if (yearParam && dateParam) {
            const year = Number(yearParam);
            const date = new Date(dateParam);
            const available = grouped.find((g) => g.year === year);
            if (
              available &&
              available.dates.some(
                (d) => d.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
              )
            ) {
              // Only update if values differ to avoid triggering loops
              if (selectedYear !== year) setSelectedYear(year);
              const selectedDateStr = selectedDate ? selectedDate.toISOString().slice(0,10) : null;
              const dateStr = date.toISOString().slice(0,10);
              if (selectedDateStr !== dateStr) setSelectedDate(date);
              return;
            }
          }
        }

        if (grouped.length) {
          const defaultYear = grouped[0].year;
          const defaultDate = grouped[0].dates[0];
          if (selectedYear !== defaultYear) setSelectedYear(defaultYear);
          const selectedDateStr = selectedDate ? selectedDate.toISOString().slice(0,10) : null;
          const defaultDateStr = defaultDate.toISOString().slice(0,10);
          if (selectedDateStr !== defaultDateStr) setSelectedDate(defaultDate);
        }
      } catch (err) {
        console.error("Errore fetch dates:", err);
      }
    };
    fetchDates();
  }, [searchParamsClient]);

  useEffect(() => {
    if (!pathname) return;
    const params = new URLSearchParams();
    if (selectedYear > 0) params.set("year", String(selectedYear));
    if (selectedDate) params.set("date", selectedDate.toISOString().slice(0, 10));
    const newSearch = params.toString() ? `?${params.toString()}` : "";

    // Avoid unnecessary replace calls if search did not change or already replaced
    if (typeof window !== 'undefined') {
      const currentSearch = window.location.search || "";
      if (currentSearch === newSearch) return;
    }

    // If there was an initial user-provided search, skip the first automatic replace to avoid overriding it
    if (skipInitialReplaceRef.current) {
      skipInitialReplaceRef.current = false;
      // Record that we've already 'accepted' the user's search to suppress spurious future replaces
      lastReplacedSearchRef.current = window.location.search || null;
      return;
    }

    if (lastReplacedSearchRef.current === newSearch) return;

    const newUrl = `${pathname}${newSearch}`;
    router.replace(newUrl, { scroll: false });
    lastReplacedSearchRef.current = newSearch;
  }, [selectedYear, selectedDate, router, pathname]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    const fetchRanking = async () => {
      try {
        const dateStr = selectedDate.toISOString().slice(0, 10);
        const res = await fetch(`/api/ranking?date=${dateStr}`);
        const data = await res.json();
        setRankings(data.rankings || []);
      } catch (err) {
        console.error(err);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [selectedDate]);

  if (!datesByYear.length)
    return (
      <main className="w-full min-h-screen bg-gray-900 text-white flex flex-col p-4">
        {/* TITLE */}
        <h1 className="text-3xl font-bold text-center mb-6 text-yellow-400">
          All ATP Rankings Reconstructed<br />
          Week by Week
        </h1>

        {/* DISCLAIMER */}
        <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed">
            The <span className="!text-cyan-400 font-semibold">ATP ranking</span> was officially introduced on <span className="!text-cyan-400">23 August 1973</span>, marking a major turning point in men's professional tennis. Prior to its introduction, tournament seedings were often determined subjectively, based on the opinions of journalists, officials, or tournament organizers.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mt-2 !text-cyan-400 font-semibold">
            Early publication frequency
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Unlike today, the ATP ranking was not published on a <span className="!text-cyan-400 font-semibold">weekly basis</span> from the start:
          </p>
          <ul className="text-gray-300 text-sm leading-relaxed ml-4 mt-1 list-disc">
            <li><span className="!text-cyan-400">1973–1977</span>: rankings were released irregularly, often only a few times per year, typically around major tournaments or key moments of the season.</li>
            <li><span className="!text-cyan-400">1978–1981</span>: rankings became more frequent but were still not weekly, with updates sometimes occurring every two or three weeks.</li>
            <li><span className="!text-cyan-400 font-semibold">From 1982 onward</span>: the ATP introduced a regular weekly ranking, establishing the continuous and standardized system used today.</li>
          </ul>
          <p className="text-gray-300 text-sm leading-relaxed mt-2">
            This approach inevitably leads to <span className="!text-cyan-400 font-semibold">ranking recalculations</span>. The most significant result of this reconstruction is that <span className="!text-yellow-400 font-bold">Guillermo Vilas</span> emerges as <span className="!text-yellow-400 font-bold">World No. 1</span> from <span className="!text-cyan-400">17 November 1975 to 16 January 1976</span>.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mt-2">
            In a comparable case, the <span className="!text-cyan-400">WTA</span> officially recognized <span className="!text-cyan-400">Evonne Goolagong</span> as World No. 1 retroactively in <span className="!text-cyan-400">2007</span>, acknowledging historical inconsistencies in early ranking systems.
            We hope that, sooner or later, the ATP may take a similar step.
          </p>
        </div>

        {/* ADDITIONAL NOTE */}
        <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed">
            For this reason, building on research and historical reconstructions available online, we decided to reconstruct the ATP ranking on a week-by-week basis starting from the very first official ranking.
          </p>
        </div>

        <div className="flex items-center justify-center min-h-screen text-gray-300">Loading dates...</div>
      </main>
    );
  if (loading)
    return (
      <main className="w-full min-h-screen bg-gray-900 text-white flex flex-col p-4">
        {/* TITLE */}
        <h1 className="text-3xl font-bold text-center mb-6 text-yellow-400">
          All ATP Rankings Reconstructed<br />
          Week by Week
        </h1>

        {/* DISCLAIMER */}
        <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed">
            The <span className="!text-cyan-400 font-semibold">ATP ranking</span> was officially introduced on <span className="!text-cyan-400">23 August 1973</span>, marking a major turning point in men's professional tennis. Prior to its introduction, tournament seedings were often determined subjectively, based on the opinions of journalists, officials, or tournament organizers.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mt-2 !text-cyan-400 font-semibold">
            Early publication frequency
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Unlike today, the ATP ranking was not published on a <span className="!text-cyan-400 font-semibold">weekly basis</span> from the start:
          </p>
          <ul className="text-gray-300 text-sm leading-relaxed ml-4 mt-1 list-disc">
            <li><span className="!text-cyan-400">1973–1977</span>: rankings were released irregularly, often only a few times per year, typically around major tournaments or key moments of the season.</li>
            <li><span className="!text-cyan-400">1978–1981</span>: rankings became more frequent but were still not weekly, with updates sometimes occurring every two or three weeks.</li>
            <li><span className="!text-cyan-400 font-semibold">From 1982 onward</span>: the ATP introduced a regular weekly ranking, establishing the continuous and standardized system used today.</li>
          </ul>
          <p className="text-gray-300 text-sm leading-relaxed mt-2">
            This approach inevitably leads to <span className="!text-cyan-400 font-semibold">ranking recalculations</span>. The most significant result of this reconstruction is that <span className="!text-yellow-400 font-bold">Guillermo Vilas</span> emerges as <span className="!text-yellow-400 font-bold">World No. 1</span> from <span className="!text-cyan-400">17 November 1975 to 16 January 1976</span>.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mt-2">
            In a comparable case, the <span className="!text-cyan-400">WTA</span> officially recognized <span className="!text-cyan-400">Evonne Goolagong</span> as World No. 1 retroactively in <span className="!text-cyan-400">2007</span>, acknowledging historical inconsistencies in early ranking systems.
            We hope that, sooner or later, the ATP may take a similar step.
          </p>
        </div>

        {/* ADDITIONAL NOTE */}
        <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed">
            For this reason, building on research and historical reconstructions available online, we decided to reconstruct the ATP ranking on a week-by-week basis starting from the very first official ranking.
          </p>
        </div>

        <div className="flex items-center justify-center min-h-screen text-gray-300">Loading rankings...</div>
      </main>
    );

  const currentYearDates = datesByYear.find((d) => d.year === selectedYear)?.dates ?? [];

  return (
    <main className="w-full min-h-screen bg-gray-900 text-white flex flex-col p-4">
      {/* TITLE */}
      <h1 className="text-3xl font-bold text-center mb-6 text-yellow-400">
        All ATP Rankings Reconstructed<br />
        Week-by-Week
      </h1>
      <p className="text-center text-sm text-gray-400 -mt-4 mb-6">
        Looking for all-time records by ranking?{' '}
        <a href="/recordsranking" className="text-yellow-400 hover:text-yellow-200 underline">Ranking Records →</a>
        {' '}·{' '}
        <a href="/records" className="text-yellow-400 hover:text-yellow-200 underline">All Match Records →</a>
      </p>

      {/* DISCLAIMER */}
      <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm leading-relaxed">
          The <span className="!text-cyan-400 font-semibold">ATP ranking</span> was officially introduced on <span className="!text-cyan-400">23 August 1973</span>, marking a major turning point in men's professional tennis. Prior to its introduction, tournament seedings were often determined subjectively, based on the opinions of journalists, officials, or tournament organizers.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed mt-2 !text-cyan-400 font-semibold">
          Early publication frequency
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">
          Unlike today, the ATP ranking was not published on a <span className="!text-cyan-400 font-semibold">weekly basis</span> from the start:
        </p>
        <ul className="text-gray-300 text-sm leading-relaxed ml-4 mt-1 list-disc">
          <li><span className="!text-cyan-400">1973–1977</span>: rankings were released irregularly, often only a few times per year, typically around major tournaments or key moments of the season.</li>
          <li><span className="!text-cyan-400">1978–1981</span>: rankings became more frequent but were still not weekly, with updates sometimes occurring every two or three weeks.</li>
          <li><span className="!text-cyan-400 font-semibold">From 1982 onward</span>: the ATP introduced a regular weekly ranking, establishing the continuous and standardized system used today.</li>
        </ul>
        <p className="text-gray-300 text-sm leading-relaxed mt-2">
          This approach inevitably leads to <span className="!text-cyan-400 font-semibold">ranking recalculations</span>. The most significant result of this reconstruction is that <span className="!text-yellow-400 font-bold">Guillermo Vilas</span> emerges as <span className="!text-yellow-400 font-bold">World No. 1</span> from <span className="!text-cyan-400">17 November 1975 to 16 January 1976</span>.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed mt-2">
          In a comparable case, the <span className="!text-cyan-400">WTA</span> officially recognized <span className="!text-cyan-400">Evonne Goolagong</span> as World No. 1 retroactively in <span className="!text-cyan-400">2007</span>, acknowledging historical inconsistencies in early ranking systems.
          We hope that, sooner or later, the ATP may take a similar step.
        </p>
      </div>

      {/* ADDITIONAL NOTE */}
      <div className="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm leading-relaxed">
          For this reason, building on research and historical reconstructions available online, we decided to reconstruct the ATP ranking on a week-by-week basis starting from the very first official ranking.
        </p>
      </div>

      {/* FILTER CONTAINER */}
      <div className="w-full flex flex-col sm:flex-row gap-4 mb-6 items-start">
        {/* Year selector */}
        <div className="flex flex-col flex-1">
          <label htmlFor="year-select" className="text-gray-200 font-semibold mb-1">
            Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => {
              userInteractedRef.current = true;
              skipInitialReplaceRef.current = false;
              const newYear = Number(e.target.value);
              setSelectedYear(newYear);
              const lastDate = datesByYear.find((d) => d.year === newYear)?.dates[0];
              if (lastDate) setSelectedDate(lastDate);
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
          >
            {datesByYear.map((d) => (
              <option key={d.year} value={d.year}>
                {d.year}
              </option>
            ))}
          </select>
        </div>

        {/* Date selector */}
        <div className="flex flex-col flex-1">
          <label htmlFor="date-select" className="text-gray-200 font-semibold mb-1">
            Date:
          </label>
          <select
            id="date-select"
            value={selectedDate?.toISOString().slice(0, 10) || ""}
            onChange={(e) => { userInteractedRef.current = true; skipInitialReplaceRef.current = false; setSelectedDate(new Date(e.target.value)); }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
          >
            {currentYearDates.map((date) => {
              const dateStr = date.toISOString().slice(0, 10);
              return (
                <option key={dateStr} value={dateStr}>
                  {date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Selected Date */}
      {selectedDate && (
        <div className="text-center my-4">
          <span className="text-3xl md:text-4xl font-bold text-yellow-400">
            {selectedDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Ranking Table */}
      <div className="flex-1 overflow-x-auto w-full">
        {selectedDate && <RankingTable rankings={rankings} perPage={20} />}
      </div>
    </main>
  );
}
