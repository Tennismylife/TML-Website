// app/components/Pagination.tsx

import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pagesPerBlock?: number; // default: 10
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  pagesPerBlock = 20,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const currentBlock = Math.floor((page - 1) / pagesPerBlock);
  const startPage = currentBlock * pagesPerBlock + 1;
  const endPage = Math.min(startPage + pagesPerBlock - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="flex justify-center mt-4 flex-wrap gap-2 items-center p-4 rounded-2xl" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      {/* Previous */}
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={`px-5 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105
          ${page === 1 ? 'bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl'}`}
      >
        ← Previous
      </button>

      {/* blocco precedente */}
      {currentBlock > 0 && (
        <button
          onClick={() => onPageChange(startPage - 1)}
          className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
        >
          ...
        </button>
      )}

      {/* numeri di pagina */}
      <div className="flex flex-wrap gap-1">
        {pageNumbers.map((num) => (
          <button
            key={num}
            onClick={() => onPageChange(num)}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105
              ${num === page
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* blocco successivo */}
      {endPage < totalPages && (
        <button
          onClick={() => onPageChange(endPage + 1)}
          className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
        >
          ...
        </button>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={`px-5 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105
          ${page === totalPages ? 'bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl'}`}
      >
        Next →
      </button>
    </div>
  );
}
