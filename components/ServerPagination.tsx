import React from 'react'

interface ServerPaginationProps {
  page: number
  totalPages: number
  getHref: (page: number) => string
}

export default function ServerPagination({ page, totalPages, getHref }: ServerPaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex justify-center mt-4 flex-wrap gap-2 items-center p-4 rounded-2xl" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <a
        href={getHref(Math.max(1, page - 1))}
        className={`px-5 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${page === 1 ? 'bg-gray-600 text-gray-500 pointer-events-none' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'}`}
      >
        ← Previous
      </a>

      {pages.map((num) => (
        <a
          key={num}
          href={getHref(num)}
          className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${num === page ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          {num}
        </a>
      ))}

      <a
        href={getHref(Math.min(totalPages, page + 1))}
        className={`px-5 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${page === totalPages ? 'bg-gray-600 text-gray-500 pointer-events-none' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'}`}
      >
        Next →
      </a>
    </div>
  )
}
