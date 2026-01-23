import React from 'react';

export type BreadcrumbItem = {
  name: string;
  href?: string;
  current?: boolean;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="w-full px-6 py-4">
      <ol className="flex items-center flex-wrap gap-2 text-sm text-gray-300">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center">
              {it.href && !isLast ? (
                <a
                  href={it.href}
                  className="text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  {it.name}
                </a>
              ) : (
                <span {...(it.current ? { 'aria-current': 'page' } : {})} className="text-gray-100">
                  {it.name}
                </span>
              )}

              {!isLast && (
                <span className="px-2 text-gray-500" aria-hidden="true">›</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
