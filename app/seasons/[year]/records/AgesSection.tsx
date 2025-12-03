'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { createPortal } from 'react-dom';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';

function formatAge(age: number): string {
  const years = Math.floor(age);
  const days = Math.floor((age - years) * 365.25);
  return `${years}y ${days}d`;
}

interface Player {
  id: number | string;
  name: string;
  ioc: string;
  age?: number;
  minAge?: number;
  maxAge?: number;
  tourney_id: string | number;
  tourney_name: string;
  year: string;
}

interface SectionItem {
  title: string;
  list: Player[];
  fullList?: Player[];
}

interface AgesData {
  topOldest?: Player[];
  topYoungest?: Player[];
  sortedOldest?: Player[];
  sortedYoungest?: Player[];
  allYoungestItems?: SectionItem[];
  allOldestItems?: SectionItem[];
  allTitles?: SectionItem[];
  topOldestTitles?: Player[];
  topYoungestTitles?: Player[];
  surfaceList: string[];
  levelList: string[];
}

interface AgeSectionProps {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
  activeSubTab: 'main' | 'youngest' | 'oldest' | 'titles';
}

export default function AgeSection({ year, selectedSurfaces, selectedLevels, activeSubTab }: AgeSectionProps) {
  const [agesData, setAgesData] = useState<AgesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; list: Player[] } | null>(null);
  const [modalLoadingTitle, setModalLoadingTitle] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const surfaces = Array.from(selectedSurfaces).join(',');
    const query = new URLSearchParams();
    if (surfaces) query.set('surfaces', surfaces);
    if (selectedLevels) query.set('levels', selectedLevels);
    return query.toString();
  }, [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const fetchAges = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/seasons/${year}/records/ages/${activeSubTab}?${queryString}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setAgesData({
          ...data,
          sortedOldest: data.sortedOldest ?? data.topOldest ?? [],
          sortedYoungest: data.sortedYoungest ?? data.topYoungest ?? [],
          topOldest: data.topOldest ?? [],
          topYoungest: data.topYoungest ?? [],
          allYoungestItems: data.allYoungestItems ?? [],
          allOldestItems: data.allOldestItems ?? [],
          allTitles: data.allTitles ?? [],
          topOldestTitles: data.topOldestTitles ?? [],
          topYoungestTitles: data.topYoungestTitles ?? [],
          surfaceList: data.surfaceList ?? [],
          levelList: data.levelList ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchAges();
  }, [year, activeSubTab, queryString]);

  const renderTable = useCallback((data: Player[], title: string) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse" role="table" aria-label={`${title} records`}>
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left py-1 text-white">Player</th>
            <th className="text-left py-1 text-white">Age</th>
            <th className="text-left py-1 text-white">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map(p => {
            const tourneyIdParts = String(p.tourney_id).split('-');
            const tourneyId = tourneyIdParts.length > 1 ? tourneyIdParts[1] : tourneyIdParts[0];
            const playerAge = p.age ?? p.minAge ?? p.maxAge;
            const displayAge = playerAge != null ? formatAge(playerAge) : 'N/A';

            return (
              <tr key={`${p.id}-${p.tourney_id}`} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                <td className="py-1 flex items-center gap-2 text-white">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(String(p.id))}`} className="text-blue-400 hover:underline">{p.name}</Link>
                </td>
                <td className="py-1 text-white">{displayAge}</td>
                <td className="py-1 text-white">
                  <Link href={`/tournaments/${encodeURIComponent(tourneyId)}/${p.year}`} className="text-blue-400 hover:underline">{p.tourney_name}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ), []);

  const Modal = ({ title, list, onClose }: { title: string; list: Player[]; onClose: () => void }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleEscape);

      if (modalRef.current) modalRef.current.scrollTop = 0;

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }, [onClose]);

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90" onClick={onClose}>
        <div
          ref={modalRef}
          className="bg-gray-800/95 backdrop-blur-sm p-6 max-h-[80vh] overflow-y-auto rounded shadow-lg w-[min(90%,600px)]"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-white">All {title}</h2>
          {renderTable(list, title)}
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            autoFocus
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // Lazy load "View All" corretto
  const handleViewAll = async (title: string, turn?: string) => {
    try {
      setModalLoadingTitle(title);

      let url = `/api/seasons/${year}/records/ages/${activeSubTab}?full=true&${queryString}`;
      if ((activeSubTab === 'youngest' || activeSubTab === 'oldest') && turn) {
        url += `&turn=${turn}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let fullList: Player[] = [];

      if (activeSubTab === 'main') {
        fullList = title.includes('Oldest') ? data.sortedOldest ?? [] : data.sortedYoungest ?? [];
      } else if (activeSubTab === 'youngest' || activeSubTab === 'oldest') {
        // qui prendiamo direttamente fullList restituito dall'API
        fullList = data.fullList ?? [];
      } else if (activeSubTab === 'titles') {
        fullList = title.includes('Oldest') ? data.topOldestTitles ?? [] : data.topYoungestTitles ?? [];
      }

      setModalData({ title, list: fullList });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setModalLoadingTitle(null);
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!agesData) return <div className="text-white text-center py-10">No data available</div>;

  const { topOldest, topYoungest, sortedOldest, sortedYoungest, allYoungestItems, allOldestItems, topOldestTitles, topYoungestTitles } = agesData;

  const mainOldest = sortedOldest.length ? sortedOldest : topOldest ?? [];
  const mainYoungest = sortedYoungest.length ? sortedYoungest : topYoungest ?? [];

  return (
    <section className="rounded border p-4 bg-gray-800/95 backdrop-blur-sm">
      {/* MAIN TAB */}
      {activeSubTab === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <section className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
            <h3 className="font-medium mb-2 text-white">Oldest player in main draw</h3>
            {mainOldest.length ? (
              <>
                {renderTable(mainOldest, "Oldest")}
                <button
                  onClick={() => handleViewAll("Oldest Players")}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={modalLoadingTitle === "Oldest Players"}
                >
                  {modalLoadingTitle === "Oldest Players" ? "Loading..." : "View All"}
                </button>
              </>
            ) : <p className="text-gray-400">No data available.</p>}
          </section>

          <section className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
            <h3 className="font-medium mb-2 text-white">Youngest player in main draw</h3>
            {mainYoungest.length ? (
              <>
                {renderTable(mainYoungest, "Youngest")}
                <button
                  onClick={() => handleViewAll("Youngest Players")}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={modalLoadingTitle === "Youngest Players"}
                >
                  {modalLoadingTitle === "Youngest Players" ? "Loading..." : "View All"}
                </button>
              </>
            ) : <p className="text-gray-400">No data available.</p>}
          </section>
        </div>
      )}

      {/* YOUNGEST TAB */}
      {activeSubTab === 'youngest' && allYoungestItems && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allYoungestItems.map(item => (
            <section key={item.title} className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
              <h4 className="font-medium mb-2 text-white">{item.title}</h4>
              {item.list.length ? (
                <>
                  {renderTable(item.list, item.title)}
                  <button
                    onClick={() => handleViewAll(item.title, item.title)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={modalLoadingTitle === item.title}
                  >
                    {modalLoadingTitle === item.title ? "Loading..." : "View All"}
                  </button>
                </>
              ) : <p className="text-gray-400">No data available.</p>}
            </section>
          ))}
        </div>
      )}

      {/* OLDEST TAB */}
      {activeSubTab === 'oldest' && allOldestItems && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allOldestItems.map(item => (
            <section key={item.title} className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
              <h4 className="font-medium mb-2 text-white">{item.title}</h4>
              {item.list.length ? (
                <>
                  {renderTable(item.list, item.title)}
                  <button
                    onClick={() => handleViewAll(item.title, item.title)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={modalLoadingTitle === item.title}
                  >
                    {modalLoadingTitle === item.title ? "Loading..." : "View All"}
                  </button>
                </>
              ) : <p className="text-gray-400">No data available.</p>}
            </section>
          ))}
        </div>
      )}

      {/* TITLES TAB */}
      {activeSubTab === 'titles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <section className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
            <h3 className="font-medium mb-2 text-white">Oldest title winners</h3>
            {topOldestTitles?.length ? (
              <>
                {renderTable(topOldestTitles, "Oldest")}
                <button
                  onClick={() => handleViewAll("Oldest Title Winners")}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={modalLoadingTitle === "Oldest Title Winners"}
                >
                  {modalLoadingTitle === "Oldest Title Winners" ? "Loading..." : "View All"}
                </button>
              </>
            ) : <p className="text-gray-400">No data available.</p>}
          </section>

          <section className="border rounded p-4 bg-gray-800/95 backdrop-blur-sm">
            <h3 className="font-medium mb-2 text-white">Youngest title winners</h3>
            {topYoungestTitles?.length ? (
              <>
                {renderTable(topYoungestTitles, "Youngest")}
                <button
                  onClick={() => handleViewAll("Youngest Title Winners")}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={modalLoadingTitle === "Youngest Title Winners"}
                >
                  {modalLoadingTitle === "Youngest Title Winners" ? "Loading..." : "View All"}
                </button>
              </>
            ) : <p className="text-gray-400">No data available.</p>}
          </section>
        </div>
      )}

      {modalData && <Modal title={modalData.title} list={modalData.list} onClose={() => setModalData(null)} />}
    </section>
  );
}
