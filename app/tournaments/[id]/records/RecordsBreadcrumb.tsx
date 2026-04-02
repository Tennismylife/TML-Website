import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Crumb = { label: string; href?: string };

export default function RecordsBreadcrumb({
  slugId,
  tournamentName,
  crumbs,
  className = '',
}: {
  slugId: string;
  tournamentName: string;
  crumbs: Crumb[];
  className?: string;
}) {
  const allCrumbs: Crumb[] = [
    { label: `${tournamentName} Records`, href: `/tournaments/${slugId}/records` },
    ...crumbs,
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-x-1 gap-y-0.5 text-xs text-gray-400 mb-3 ${className}`}
    >
      {allCrumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-yellow-400 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-200">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
